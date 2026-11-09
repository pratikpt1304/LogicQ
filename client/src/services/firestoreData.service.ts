import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  addDoc,
  writeBatch,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  increment,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase.js';
import { User, Submission } from '../types/index.js';
import { maskPrn, formatOwnIdentityLabel, formatPublicDisplayName, isRealPersonName, normalizeDepartment, deriveDepartmentFromPrn, formatNameFromEmail } from '../config/academic.config.js';
import { isExplicitAdminEmail } from '../api/fallbackEngine.js';
import { RealtimeSyncService, realtimeSync } from './realtimeSync.service.js';
import { C_PROGRAMMING_COHORT_STUDENTS, DEMO_SECTION_COHORT_STUDENTS, findCohortStudent } from '../data/c-programming-cohort.data.js';
import { TOPIC_PRACTICE_DATA } from '../data/topic-practice.data.js';
import { PRACTICE_MODULE_1_PROBLEMS } from '../data/practice-module1.data.js';
import { PRACTICE_MODULE_2_PROBLEMS } from '../data/practice-module2.data.js';
import { PRACTICE_MODULE_3_PROBLEMS } from '../data/practice-module3.data.js';

export const DEMO_1001_COMPLETED_PROBLEMS: string[] = [];

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
   * Updates and persists Mini-Project unlock status across Firestore cohort_progress and localStorage.
   */
  public static async setMiniProjectStatus(prn: string, isUnlocked: boolean): Promise<void> {
    const cleanPrn = (prn || '').trim().toUpperCase();
    if (!cleanPrn) return;
    try {
      localStorage.setItem(`logicq_mini_project_unlocked_${cleanPrn}`, isUnlocked ? 'true' : 'false');

      // Update cached user if matches
      try {
        const uRaw = localStorage.getItem('logicq_user');
        if (uRaw) {
          const u = JSON.parse(uRaw);
          if ((u.prn || '').toUpperCase() === cleanPrn) {
            u.miniProjectUnlocked = isUnlocked;
            u.miniProjectActive = isUnlocked;
            localStorage.setItem('logicq_user', JSON.stringify(u));
          }
        }
      } catch {}

      // 1. Update cohort_progress
      const cohortRef = doc(db, 'cohort_progress', cleanPrn);
      await setDoc(cohortRef, {
        prn: cleanPrn,
        moduleProgress: {
          miniProjectUnlocked: isUnlocked,
          updatedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      }, { merge: true }).catch(() => {});

      // 2. Persist to users collection
      const userRef = doc(db, 'users', `std_${cleanPrn.toLowerCase()}`);
      await setDoc(userRef, {
        miniProjectUnlocked: isUnlocked,
        miniProjectActive: isUnlocked,
        updatedAt: new Date().toISOString(),
      }, { merge: true }).catch(() => {});

      // 3. Persist to enrolled_students collection
      const enrolledSnap = await getDocs(collection(db, 'enrolled_students')).catch(() => null);
      if (enrolledSnap) {
        for (const d of enrolledSnap.docs) {
          const data = d.data();
          if (data && ((data.prn && String(data.prn).toUpperCase() === cleanPrn) || d.id.toUpperCase() === cleanPrn)) {
            await setDoc(doc(db, 'enrolled_students', d.id), {
              miniProjectUnlocked: isUnlocked,
              miniProjectActive: isUnlocked,
            }, { merge: true }).catch(() => {});
          }
        }
      }

      RealtimeSyncService.emit('USERS');
      RealtimeSyncService.emit('DASHBOARD');
    } catch (err) {
      console.warn('setMiniProjectStatus notice:', err);
    }
  }

  /**
   * Retrieves Mini-Project unlock status from Firestore cohort_progress with localStorage fallback.
   */
  public static async getMiniProjectStatus(prn: string): Promise<boolean> {
    const cleanPrn = (prn || '').trim().toUpperCase();
    if (!cleanPrn) return false;

    // 1. Authoritative Firestore check FIRST
    try {
      const cohortRef = doc(db, 'cohort_progress', cleanPrn);
      const snap = await getDoc(cohortRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data?.moduleProgress?.miniProjectUnlocked !== undefined) {
          const val = Boolean(data.moduleProgress.miniProjectUnlocked);
          localStorage.setItem(`logicq_mini_project_unlocked_${cleanPrn}`, val ? 'true' : 'false');
          return val;
        }
      }
    } catch {}

    // 2. Fallback to localStorage cache
    const cached = localStorage.getItem(`logicq_mini_project_unlocked_${cleanPrn}`);
    if (cached !== null) return cached === 'true';

    return false;
  }

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
    if (!auth.currentUser || !uid) {
      return () => {};
    }
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
        if (error?.code !== 'permission-denied') {
          console.warn('FirestoreDataService.subscribeUserProfile notice:', error);
        }
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
    if ((updates as any).email !== undefined) {
      safePayload.email = String((updates as any).email).trim().toLowerCase();
      safePayload.isEmailBound = true;
      safePayload.emailVerified = true;
    }
    if ((updates as any).password !== undefined) safePayload.password = (updates as any).password;
    if ((updates as any).passwordChangedAt !== undefined) safePayload.passwordChangedAt = (updates as any).passwordChangedAt;

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

    // Realtime propagate across enrolled_students, sections rosters, and broadcast listeners
    try {
      await FirestoreDataService.syncStudentProfileUpdate({
        userId: targetUid,
        email: (updates as any).email,
        displayName: updates.displayName,
        department: updates.department,
        year: updates.year,
        division: updates.division,
        bio: updates.bio,
        storagePreference: updates.storagePreference,
      });
    } catch (e) {
      console.warn('syncStudentProfileUpdate non-fatal notice:', e);
    }
  }

  /**
   * Complete real-time synchronization of student profile updates (name, PRN, department, year, division)
   * across all portals: Firestore users, publicProfiles, enrolled_students, sections rosters, and broadcast listeners.
   */
  public static async syncStudentProfileUpdate(params: {
    userId?: string;
    email?: string | null;
    oldPrn?: string | null;
    newPrn?: string | null;
    displayName?: string | null;
    fullName?: string | null;
    department?: string | null;
    year?: string | null;
    division?: string | null;
    bio?: string | null;
    storagePreference?: 'GOOGLE_DRIVE' | 'FIRESTORE_FALLBACK' | 'LOCAL_STORAGE';
    hidePracticeTimer?: boolean;
  }): Promise<void> {
    const targetUid = auth.currentUser?.uid || params.userId;
    const cleanEmail = (params.email || auth.currentUser?.email || '').toLowerCase().trim();
    const effectiveName = (params.displayName || params.fullName || '').trim();
    const effectivePrn = (params.newPrn || params.oldPrn || '').toUpperCase().trim();

    // 1. Update Firestore 'users' collection (if targetUid is available)
    if (targetUid) {
      try {
        const userRef = doc(db, 'users', targetUid);
        const userPayload: Record<string, any> = {
          updatedAt: serverTimestamp(),
        };
        if (effectiveName) userPayload.displayName = effectiveName;
        if (params.department) userPayload.department = params.department;
        if (params.year) userPayload.year = params.year;
        if (params.division !== undefined) userPayload.division = params.division;
        if (params.bio !== undefined) userPayload.bio = params.bio;
        if (params.newPrn) userPayload.prn = params.newPrn;
        if (cleanEmail) {
          userPayload.email = cleanEmail;
          userPayload.isEmailBound = !cleanEmail.endsWith('@sanjivani.edu.in');
          userPayload.emailVerified = true;
        }
        if (params.storagePreference) userPayload.storagePreference = params.storagePreference;
        if (params.hidePracticeTimer !== undefined) userPayload.hidePracticeTimer = params.hidePracticeTimer;

        await setDoc(userRef, userPayload, { merge: true });

        // Update publicProfiles
        const publicRef = doc(db, 'publicProfiles', targetUid);
        const publicPayload: Record<string, any> = {
          userId: targetUid,
          updatedAt: serverTimestamp(),
        };
        if (effectiveName) publicPayload.displayName = effectiveName;
        if (params.department) publicPayload.department = params.department;
        if (params.year) publicPayload.year = params.year;
        if (params.division !== undefined) publicPayload.division = params.division;
        if (params.bio !== undefined) publicPayload.bio = params.bio;
        await setDoc(publicRef, publicPayload, { merge: true }).catch(() => {});
      } catch (err) {
        console.warn('syncStudentProfileUpdate users doc notice:', err);
      }
    }

    // 2. Update Firestore 'enrolled_students' collection
    try {
      const enrolledSnap = await getDocs(collection(db, 'enrolled_students'));
      for (const d of enrolledSnap.docs) {
        const data = d.data();
        if (!data) continue;
        const dEmail = (data.email || '').toLowerCase().trim();
        const dPrn = (data.prn || '').toUpperCase().trim();
        const dUid = data.userId || data.studentId || data.uid;

        const isMatch =
          (cleanEmail && dEmail === cleanEmail) ||
          (effectivePrn && dPrn === effectivePrn) ||
          (params.oldPrn && dPrn === params.oldPrn.toUpperCase().trim()) ||
          (targetUid && dUid === targetUid);

        if (isMatch) {
          const updateData: Record<string, any> = {
            updatedAt: serverTimestamp(),
          };
          if (cleanEmail) {
            updateData.email = cleanEmail;
          }
          if (effectiveName) {
            updateData.name = effectiveName;
            updateData.fullName = effectiveName;
            updateData.displayName = effectiveName;
          }
          if (params.newPrn) {
            updateData.prn = params.newPrn;
          }
          if (params.department) {
            updateData.department = params.department;
          }
          if (params.year) {
            updateData.year = params.year;
          }
          if (params.division !== undefined) {
            updateData.division = params.division;
          }
          await setDoc(d.ref, updateData, { merge: true }).catch(() => {});
        }
      }

      // Ensure a canonical enrolled_students document exists for this PRN
      if (effectivePrn) {
        try {
          const canonicalRef = doc(db, 'enrolled_students', effectivePrn);
          const canonicalPayload: Record<string, any> = {
            prn: effectivePrn,
            updatedAt: serverTimestamp(),
          };
          if (cleanEmail) {
            canonicalPayload.email = cleanEmail;
          }
          if (effectiveName) {
            canonicalPayload.name = effectiveName;
            canonicalPayload.fullName = effectiveName;
            canonicalPayload.displayName = effectiveName;
          }
          if (params.department) canonicalPayload.department = params.department;
          if (params.year) canonicalPayload.year = params.year;
          if (params.division !== undefined) canonicalPayload.division = params.division;
          canonicalPayload.sectionId = 'LQ-C31A';
          canonicalPayload.college = 'Sanjivani University';
          canonicalPayload.status = 'ACTIVE';

          await setDoc(canonicalRef, canonicalPayload, { merge: true });
        } catch (e) {
          console.warn('syncStudentProfileUpdate canonical enrolled_students notice:', e);
        }
      }
    } catch (err) {
      console.warn('syncStudentProfileUpdate enrolled_students notice:', err);
    }

    // 3. Update Firestore 'sections' collection rosters
    try {
      const secSnap = await getDocs(collection(db, 'sections'));
      for (const d of secSnap.docs) {
        const secData = d.data();
        if (!secData || !Array.isArray(secData.students)) continue;

        let modified = false;
        const updatedStudents = secData.students.map((st: any) => {
          if (!st) return st;
          const stEmail = (st.email || st.student?.email || '').toLowerCase().trim();
          const stPrn = (st.prn || st.student?.prn || '').toUpperCase().trim();
          const stUid = st.id || st.uid || st.userId || st.student?.id;

          const isMatch =
            (cleanEmail && stEmail === cleanEmail) ||
            (effectivePrn && stPrn === effectivePrn) ||
            (params.oldPrn && stPrn === params.oldPrn.toUpperCase().trim()) ||
            (targetUid && stUid === targetUid);

          if (isMatch) {
            modified = true;
            return {
              ...st,
              email: cleanEmail || st.email,
              name: effectiveName || st.name || st.fullName,
              fullName: effectiveName || st.fullName || st.name,
              displayName: effectiveName || st.displayName || st.name,
              prn: params.newPrn || st.prn,
              department: params.department || st.department,
              year: params.year || st.year,
              division: params.division !== undefined ? params.division : st.division,
              student: st.student
                ? {
                    ...st.student,
                    email: cleanEmail || st.student.email,
                    fullName: effectiveName || st.student.fullName,
                    displayName: effectiveName || st.student.displayName,
                    prn: params.newPrn || st.student.prn,
                    department: params.department || st.student.department,
                    year: params.year || st.student.year,
                  }
                : undefined,
            };
          }
          return st;
        });

        if (modified) {
          await setDoc(d.ref, { students: updatedStudents, updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});

          // Also update local cache for this section
          try {
            const secKey = d.id;
            localStorage.setItem(`logicq_section_students_${secKey}`, JSON.stringify(updatedStudents));
            if (secData.joinCode) {
              localStorage.setItem(`logicq_section_students_${secData.joinCode}`, JSON.stringify(updatedStudents));
            }
          } catch {}
        }
      }
    } catch (err) {
      console.warn('syncStudentProfileUpdate sections notice:', err);
    }

    // 3b. Update cohort_progress in Cloud Firestore so admin portals see updated identity immediately
    const prnToSync = (params.newPrn || params.oldPrn || effectivePrn || FirestoreDataService.resolvePrn(targetUid) || '').toUpperCase().trim();
    if (prnToSync) {
      try {
        const cohortRef = doc(db, 'cohort_progress', prnToSync);
        const cohortSnap = await getDoc(cohortRef).catch(() => null);
        const existingData = cohortSnap && cohortSnap.exists() ? cohortSnap.data() : {};

        await setDoc(cohortRef, {
          prn: prnToSync,
          studentName: effectiveName || existingData.studentName || undefined,
          studentEmail: cleanEmail || existingData.studentEmail || undefined,
          department: params.department || existingData.department || undefined,
          division: params.division !== undefined ? params.division : existingData.division,
          year: params.year || existingData.year || undefined,
          updatedAt: serverTimestamp(),
        }, { merge: true });

        // If PRN changed, migrate old cohort document
        if (params.oldPrn && params.newPrn && params.oldPrn.toUpperCase().trim() !== params.newPrn.toUpperCase().trim()) {
          const oldPrnKey = params.oldPrn.toUpperCase().trim();
          const oldCohortRef = doc(db, 'cohort_progress', oldPrnKey);
          const oldSnap = await getDoc(oldCohortRef).catch(() => null);
          if (oldSnap && oldSnap.exists()) {
            await setDoc(cohortRef, oldSnap.data(), { merge: true });
            await deleteDoc(oldCohortRef).catch(() => {});
          }
        }
      } catch (cohortErr) {
        console.warn('syncStudentProfileUpdate cohort_progress notice:', cohortErr);
      }
    }

    // 4. Update local active user and stored users cache
    try {
      const activeRaw = localStorage.getItem('logicq_active_user');
      if (activeRaw) {
        const active = JSON.parse(activeRaw);
        const merged = {
          ...active,
          displayName: effectiveName || active.displayName,
          fullName: effectiveName || active.fullName,
          prn: params.newPrn || active.prn,
          department: params.department || active.department,
          year: params.year || active.year,
          division: params.division !== undefined ? params.division : active.division,
          bio: params.bio !== undefined ? params.bio : active.bio,
        };
        localStorage.setItem('logicq_active_user', JSON.stringify(merged));
      }

      // Update stored users
      const storedUsersRaw = localStorage.getItem('logicq_stored_users_v1');
      if (storedUsersRaw) {
        const storedUsers = JSON.parse(storedUsersRaw);
        if (Array.isArray(storedUsers)) {
          const updatedList = storedUsers.map((u: any) => {
            const uEmail = (u.email || '').toLowerCase().trim();
            const uPrn = (u.prn || '').toUpperCase().trim();
            const uId = u.id || u.uid;
            if (
              (cleanEmail && uEmail === cleanEmail) ||
              (effectivePrn && uPrn === effectivePrn) ||
              (params.oldPrn && uPrn === params.oldPrn.toUpperCase().trim()) ||
              (targetUid && uId === targetUid)
            ) {
              return {
                ...u,
                displayName: effectiveName || u.displayName,
                fullName: effectiveName || u.fullName,
                prn: params.newPrn || u.prn,
                department: params.department || u.department,
                year: params.year || u.year,
                division: params.division !== undefined ? params.division : u.division,
              };
            }
            return u;
          });
          localStorage.setItem('logicq_stored_users_v1', JSON.stringify(updatedList));
        }
      }
    } catch {}

    // 5. Broadcast real-time signal across all portals & windows
    try {
      RealtimeSyncService.emit('USERS');
      RealtimeSyncService.emit('SECTIONS');
      RealtimeSyncService.emit('DASHBOARD');
      RealtimeSyncService.emit('SUBMISSIONS');
    } catch {}
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
                isCheatAutoSubmit: Boolean(data.isCheatAutoSubmit),
                isCheatAttempt: Boolean(data.isCheatAttempt),
                quarantinedAttempt: Boolean(data.quarantinedAttempt),
                tag: data.tag || (data.isCheatAttempt ? 'TRY_TO_CHEAT' : undefined),
                cheatReason: data.cheatReason || undefined,
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

      let activePrn = '';
      let activeEmail = '';
      try {
        const raw = localStorage.getItem('logicq_active_user');
        if (raw) {
          const u = JSON.parse(raw);
          activePrn = (u.prn || '').trim().toUpperCase();
          activeEmail = (u.email || '').trim().toLowerCase();
        }
      } catch {}

      if (activePrn) {
        const qPrn = query(collection(db, 'submissions'), where('studentPrn', '==', activePrn));
        const snapPrn = await getDocs(qPrn).catch(() => null);
        if (snapPrn) {
          snapPrn.forEach((d) => {
            const data = d.data();
            if (!submissionMap.has(d.id)) {
              submissionMap.set(d.id, {
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
                isCheatAutoSubmit: Boolean(data.isCheatAutoSubmit),
                isCheatAttempt: Boolean(data.isCheatAttempt),
                quarantinedAttempt: Boolean(data.quarantinedAttempt),
                tag: data.tag || (data.isCheatAttempt ? 'TRY_TO_CHEAT' : undefined),
                cheatReason: data.cheatReason || undefined,
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

      // Merge locally recorded submissions from fallback store
      try {
        const rawSubs = localStorage.getItem('logicq_fallback_submissions_v1');
        if (rawSubs) {
          const parsed = JSON.parse(rawSubs);
          if (Array.isArray(parsed)) {
            parsed.forEach((s: any) => {
              const sp = (s.prn || s.studentPrn || s.user?.prn || '').trim().toUpperCase();
              const se = (s.email || s.studentEmail || s.user?.email || '').trim().toLowerCase();
              const su = s.userId || s.uid || s.user?.id;
              if (
                (targetUids.includes(su)) ||
                (activePrn && sp === activePrn) ||
                (activeEmail && se === activeEmail)
              ) {
                if (!submissionMap.has(s.id)) {
                  submissionMap.set(s.id, {
                    id: s.id,
                    userId: s.userId || uid,
                    problemId: s.problemId || '',
                    contestId: s.contestId || null,
                    code: s.code || '',
                    language: s.language || 'c',
                    verdict: s.verdict || 'ACCEPTED',
                    runtimeMs: s.runtimeMs ?? 14,
                    memoryKb: s.memoryKb ?? 1024,
                    compileOutput: s.compileOutput ?? null,
                    pointsAwarded: Number(s.pointsAwarded || 10),
                    createdAt: s.createdAt || new Date().toISOString(),
                    isCheatAutoSubmit: Boolean(s.isCheatAutoSubmit),
                    isCheatAttempt: Boolean(s.isCheatAttempt),
                    quarantinedAttempt: Boolean(s.quarantinedAttempt),
                    tag: s.tag,
                    cheatReason: s.cheatReason,
                    problem: s.problem || {
                      id: s.problemId || '',
                      title: s.problemTitle || 'Challenge Problem',
                      slug: s.problemSlug || s.problemId || '',
                      difficulty: s.difficulty || 'MEDIUM',
                    },
                  });
                }
              }
            });
          }
        }
      } catch {}

      // Cross-Device Sync: Also query assessment_test_submissions for this user / PRN / email
      try {
        const assessQueries = [
          ...targetUids.map((u) => query(collection(db, 'assessment_test_submissions'), where('userId', '==', u))),
          ...(activePrn ? [query(collection(db, 'assessment_test_submissions'), where('studentPrn', '==', activePrn))] : []),
          ...(activeEmail ? [query(collection(db, 'assessment_test_submissions'), where('studentEmail', '==', activeEmail))] : []),
        ];

        const assessSnaps = await Promise.all(assessQueries.map((q) => getDocs(q).catch(() => null)));
        for (const snap of assessSnaps) {
          if (snap) {
            snap.forEach((d) => {
              const data = d.data();
              if (!submissionMap.has(d.id)) {
                submissionMap.set(d.id, {
                  id: d.id,
                  userId: data.userId || uid,
                  problemId: data.problemId || data.testId || '',
                  contestId: data.testId || null,
                  code: data.code || '',
                  language: data.language || 'c',
                  verdict: data.verdict || (data.status === 'PASSED' ? 'ACCEPTED' : 'FAILED'),
                  runtimeMs: data.runtimeMs ?? 15,
                  memoryKb: data.memoryKb ?? 1024,
                  compileOutput: data.compileOutput ?? null,
                  pointsAwarded: Number(data.academicScore || data.score || data.points || 0),
                  createdAt: data.submittedAt || data.createdAt || new Date().toISOString(),
                  isCheatAutoSubmit: Boolean(data.isCheatAutoSubmit),
                  isCheatAttempt: Boolean(data.isCheatAttempt),
                  quarantinedAttempt: false,
                  tag: 'LAB_INTERNAL',
                  problem: {
                    id: data.problemId || data.testId || '',
                    title: data.problemTitle || data.testTitle || 'Lab Internal Problem',
                    slug: data.problemSlug || data.problemId || '',
                    difficulty: 'MEDIUM',
                  },
                });
              }
            });
          }
        }
      } catch (err) {
        console.warn('getUserSubmissions: assessment_test_submissions cross-device query notice:', err);
      }

      const list = Array.from(submissionMap.values());
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      console.warn('FirestoreDataService.getUserSubmissions error:', err);
      return [];
    }
  }

  /**
   * Directly logs an anti-cheat auto-submitted penalised attempt into Firestore submissions
   */
  public static async recordCheatSubmission(
    userId: string,
    data: {
      problemId: string;
      problemTitle: string;
      problemSlug: string;
      code: string;
      violationReason: string;
      difficulty?: string;
    }
  ): Promise<void> {
    try {
      const primaryUid = auth.currentUser?.uid || userId;
      if (!primaryUid) return;
      await addDoc(collection(db, 'submissions'), {
        userId: primaryUid,
        problemId: data.problemId,
        code: data.code || '// Auto-submitted cheat penalty',
        language: 'c',
        verdict: 'WRONG_ANSWER',
        runtimeMs: 0,
        memoryKb: 0,
        compileOutput: `[Anti-Cheat Auto-Lock]: ${data.violationReason}`,
        pointsAwarded: 0,
        isCheatAutoSubmit: true,
        isCheatAttempt: true,
        quarantinedAttempt: true,
        tag: 'TRY_TO_CHEAT',
        cheatReason: data.violationReason,
        createdAt: serverTimestamp(),
        problem: {
          id: data.problemId,
          title: data.problemTitle,
          slug: data.problemSlug,
          difficulty: data.difficulty || 'EASY',
        },
      });
    } catch (err) {
      console.warn('FirestoreDataService.recordCheatSubmission warning:', err);
    }
  }

  /**
   * Records a completed daily challenge submission in Firestore with solve duration & telemetry
   */
  public static async recordDailySubmission(
    userId: string,
    data: {
      problemId: string;
      problemTitle: string;
      problemSlug: string;
      difficulty: string;
      code: string;
      verdict: string;
      timeTakenSeconds: number;
      tabSwitchCount?: number;
      copyPasteAttempts?: number;
      fullscreenExits?: number;
      submissionType?: string;
      attemptNumber?: number;
      isLate?: boolean;
      lateStatus?: string;
      academicScore?: number;
      score?: number;
      marksAwarded?: number;
      maxMarks?: number;
      manualGradingRequired?: boolean;
      allocatedDurationMinutes?: number;
      timeLimitSeconds?: number;
      prn?: string;
      studentPrn?: string;
      email?: string;
      studentEmail?: string;
      studentName?: string;
    }
  ): Promise<void> {
    try {
      const primaryUid = auth.currentUser?.uid || userId;
      if (!primaryUid) return;
      const effectivePrn = (data.prn || data.studentPrn || '').toUpperCase().trim();
      const effectiveEmail = (data.email || data.studentEmail || '').toLowerCase().trim();
      const effectiveName = data.studentName || '';

      const isPractice = String(data.submissionType || '').toUpperCase() === 'PRACTICE';
      const isLate = Boolean(data.isLate || data.lateStatus === 'LATE');
      const maxMarks = Number(data.maxMarks || 10);
      const pointsAwarded = isPractice
        ? 0
        : isLate
        ? 0
        : (data.verdict === 'ACCEPTED' ? (data.academicScore ?? data.marksAwarded ?? (data.submissionType === 'LAB_INTERNAL' ? 20 : 10)) : 0);

      // 1. Write to submissions collection (safely guarded)
      try {
        await addDoc(collection(db, 'submissions'), {
          userId: primaryUid,
          uid: primaryUid,
          prn: effectivePrn,
          studentPrn: effectivePrn,
          email: effectiveEmail,
          studentEmail: effectiveEmail,
          studentName: effectiveName,
          user: {
            id: primaryUid,
            uid: primaryUid,
            prn: effectivePrn,
            email: effectiveEmail,
            fullName: effectiveName,
          },
          problemId: data.problemId,
          code: data.code,
          language: 'c',
          verdict: data.verdict,
          pointsAwarded,
          academicScore: pointsAwarded,
          score: pointsAwarded,
          marksAwarded: pointsAwarded,
          maxMarks,
          isLate,
          lateStatus: isLate ? 'LATE' : 'ON_TIME',
          manualGradingRequired: isLate || Boolean(data.manualGradingRequired),
          submissionType: data.submissionType || 'DAILY',
          attemptNumber: data.attemptNumber || 1,
          timeTakenSeconds: data.timeTakenSeconds,
          timeToSolveSeconds: data.timeTakenSeconds,
          activeSeconds: data.timeTakenSeconds,
          tabSwitchCount: data.tabSwitchCount || 0,
          copyPasteAttempts: data.copyPasteAttempts || 0,
          fullscreenExits: data.fullscreenExits || 0,
          createdAt: serverTimestamp(),
          problem: {
            id: data.problemId,
            title: data.problemTitle,
            slug: data.problemSlug,
            difficulty: data.difficulty || 'EASY',
          },
        });
      } catch (subErr) {
        console.warn('Submissions collection addDoc notice:', subErr);
      }

      // 2. Authoritatively write to assessment_test_submissions so Answer Bank and Live Listeners see it instantly
      try {
        await addDoc(collection(db, 'assessment_test_submissions'), {
          studentPrn: effectivePrn,
          prn: effectivePrn,
          studentName: effectiveName,
          name: effectiveName,
          studentEmail: effectiveEmail,
          email: effectiveEmail,
          userId: primaryUid,
          uid: primaryUid,
          problemId: data.problemId,
          problemTitle: data.problemTitle,
          code: data.code,
          verdict: data.verdict,
          academicScore: pointsAwarded,
          score: pointsAwarded,
          pointsAwarded,
          marksAwarded: pointsAwarded,
          maxMarks,
          isLate,
          lateStatus: isLate ? 'LATE' : 'ON_TIME',
          manualGradingRequired: isLate || Boolean(data.manualGradingRequired),
          submissionType: data.submissionType || 'PRACTICE',
          attemptNumber: data.attemptNumber || 1,
          testTitle: isPractice ? 'Continuous Practical Lab' : 'Lab Internal Assessment',
          difficulty: data.difficulty || 'EASY',
          timeTakenSeconds: data.timeTakenSeconds || 0,
          tabSwitchCount: data.tabSwitchCount || 0,
          copyPasteAttempts: data.copyPasteAttempts || 0,
          fullscreenExits: data.fullscreenExits || 0,
          submittedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } catch (attErr) {
        console.warn('assessment_test_submissions write notice:', attErr);
      }

      // 3. Save problem solution code directly into student draft vault in cohort_progress
      if (effectivePrn && data.code) {
        try {
          await setDoc(doc(db, 'cohort_progress', effectivePrn, 'drafts', `practice_topic_${data.problemId}`), {
            code: data.code,
            problemSlug: data.problemId,
            updatedAt: Date.now(),
          }, { merge: true });
        } catch (dErr) {
          console.warn('cohort_progress draft code sync notice:', dErr);
        }
      }

      // Synchronize with local fallback submissions store for instant offline/API visibility
      const subObj = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: primaryUid,
        uid: primaryUid,
        prn: effectivePrn,
        studentPrn: effectivePrn,
        email: effectiveEmail,
        studentEmail: effectiveEmail,
        studentName: effectiveName,
        user: {
          id: primaryUid,
          uid: primaryUid,
          prn: effectivePrn,
          email: effectiveEmail,
          fullName: effectiveName,
          displayName: effectiveName,
        },
        problemId: data.problemId,
        code: data.code,
        language: 'c',
        verdict: data.verdict,
        pointsAwarded,
        submissionType: data.submissionType || 'PRACTICE',
        timeTakenSeconds: data.timeTakenSeconds,
        timeToSolveSeconds: data.timeTakenSeconds,
        activeSeconds: data.timeTakenSeconds,
        tabSwitchCount: data.tabSwitchCount || 0,
        copyPasteAttempts: data.copyPasteAttempts || 0,
        fullscreenExits: data.fullscreenExits || 0,
        createdAt: new Date().toISOString(),
        problem: {
          id: data.problemId,
          title: data.problemTitle,
          slug: data.problemSlug,
          difficulty: data.difficulty || 'EASY',
        },
      };

      try {
        const rawSubs = localStorage.getItem('logicq_fallback_submissions_v1');
        const parsedSubs = rawSubs ? JSON.parse(rawSubs) : [];
        if (Array.isArray(parsedSubs)) {
          parsedSubs.unshift(subObj);
          localStorage.setItem('logicq_fallback_submissions_v1', JSON.stringify(parsedSubs.slice(0, 500)));
        }
      } catch {}

      // Update active user points, streak, and solved count in localStorage
      try {
        const rawUser = localStorage.getItem('logicq_active_user');
        if (rawUser) {
          const u = JSON.parse(rawUser);
          if (data.verdict === 'ACCEPTED') {
            u.totalPoints = (u.totalPoints || 0) + pointsAwarded;
            u.totalSolved = (u.totalSolved || 0) + 1;
            u.currentStreak = Math.max(u.currentStreak || 0, 1);
            localStorage.setItem('logicq_active_user', JSON.stringify(u));
          }
        }
      } catch {}

      // Update Firestore user document if user has an established profile
      try {
        if (primaryUid && data.verdict === 'ACCEPTED') {
          updateDoc(doc(db, 'users', primaryUid), {
            totalPoints: increment(pointsAwarded),
            totalSolved: increment(1),
            lastSolvedDate: new Date().toISOString(),
          }).catch(() => {});
        }
      } catch {}

      // Also update cohort_progress in Cloud Firestore so admin portals see updated points & solved count immediately
      if (effectivePrn) {
        try {
          const cohortRef = doc(db, 'cohort_progress', effectivePrn);
          const cohortSnap = await getDoc(cohortRef).catch(() => null);
          const cData = cohortSnap && cohortSnap.exists() ? cohortSnap.data() : {};
          const completedList: string[] = Array.isArray(cData.completedProblems) ? [...cData.completedProblems] : [];
          if (data.verdict === 'ACCEPTED' && !completedList.includes(data.problemId)) {
            completedList.push(data.problemId);
          }

          const currentSolved = completedList.length;
          const currentPoints = (cData.totalPoints || 0) + pointsAwarded;
          const prevMod = cData.moduleProgress || {};

          await setDoc(
            cohortRef,
            {
              prn: effectivePrn,
              totalSolved: currentSolved,
              totalPoints: currentPoints,
              completedProblems: completedList,
              moduleProgress: {
                ...prevMod,
                activeSession: true,
                currentProblem: data.problemTitle,
                currentModule: 'Continuous Practical Lab',
                academicScore: Math.min(100, currentSolved * 20),
                lastActiveTime: new Date().toISOString(),
              },
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (cErr) {
          console.warn('recordDailySubmission cohort_progress sync notice:', cErr);
        }
      }

      // Broadcast real-time updates across open tabs and listener hooks
      RealtimeSyncService.emit('SUBMISSIONS');
      RealtimeSyncService.emit('DASHBOARD');
      RealtimeSyncService.emit('USERS');
    } catch (err) {
      console.warn('FirestoreDataService.recordDailySubmission warning:', err);
    }
  }

  /**
   * Fetches all submissions from Firestore for administrative oversight
   */
  public static async getAllFirestoreSubmissions(): Promise<any[]> {
    try {
      const snap = await getDocs(collection(db, 'submissions'));
      const list: any[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data) {
          list.push({ id: d.id, ...data });
        }
      });
      return list;
    } catch (err: any) {
      if (err?.code !== 'permission-denied') {
        console.warn('getAllFirestoreSubmissions notice:', err);
      }
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
    if (!auth.currentUser || !uid) {
      return () => {};
    }
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
        if ((error as any)?.code !== 'permission-denied') {
          console.warn('FirestoreDataService.subscribeUserSubmissions notice:', error);
        }
        if (onError) onError(error);
      }
    );
  }

  /**
   * Resolves canonical PRN from identifier, email, or active local session.
   */
  public static resolvePrn(identifier?: string): string | null {
    if (identifier) {
      const clean = String(identifier).trim().toUpperCase();
      if (clean.startsWith('COHORT-')) {
        return clean.replace(/^COHORT-/, '');
      }
      if (clean.startsWith('STU-')) {
        const withoutPrefix = clean.replace(/^STU-/, '');
        if (withoutPrefix.length >= 2 && !withoutPrefix.includes('@')) {
          return withoutPrefix;
        }
      }
      if (/^[0-9]{4}[A-Z]{3,4}[MF]?[0-9]{3,4}$/.test(clean)) {
        return clean;
      }
      // Support institutional & custom PRNs (e.g. DEMO1, DUMMY, 2126PMIM1130, TEST01)
      if (/^[A-Z0-9_-]{2,30}$/.test(clean) && !['ANON', 'UNDEFINED', 'NULL', 'CURRENT', 'STUDENT', 'ADMIN', 'FALSE', 'TRUE'].includes(clean)) {
        return clean;
      }
      const student = findCohortStudent(clean);
      if (student) return student.prn.toUpperCase();
    }
    try {
      const raw = localStorage.getItem('logicq_active_user') || localStorage.getItem('logicq_user');
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.prn) return String(u.prn).trim().toUpperCase();
        if (u?.username && /^[A-Z0-9_-]{2,30}$/i.test(u.username)) return String(u.username).trim().toUpperCase();
        if (u?.email) {
          const student = findCohortStudent(u.email);
          if (student) return student.prn.toUpperCase();
        }
      }
    } catch {}
    if (auth.currentUser?.email) {
      const student = findCohortStudent(auth.currentUser.email);
      if (student) return student.prn.toUpperCase();
    }
    return null;
  }

  /**
   * Compares two PRNs with case-insensitivity, trim, and O (letter) vs 0 (digit) tolerance.
   */
  public static arePrnsMatching(a?: string | null, b?: string | null): boolean {
    if (!a || !b) return false;
    const cleanA = String(a).toUpperCase().trim().replace(/^COHORT-/, '');
    const cleanB = String(b).toUpperCase().trim().replace(/^COHORT-/, '');
    if (cleanA === cleanB) return true;
    if (cleanA.replace(/O/g, '0') === cleanB.replace(/O/g, '0')) return true;
    return false;
  }

  /**
   * Persists student practice progress in users/{uid}/drafts/practice_progress and cohort_progress/{prn}
   */
  public static async savePracticeProgress(uid: string, completedProblems: string[]): Promise<void> {
    const effectiveUid = auth.currentUser?.uid || uid;
    const localKey = effectiveUid ? `logicq_practice_progress_${effectiveUid}` : 'logicq_practice_progress';
    const uniqueProblems = Array.from(new Set(completedProblems));
    try {
      localStorage.setItem(localKey, JSON.stringify(uniqueProblems));
    } catch {}

    // 1. Cross-Device Cloud Sync for Cohort Students via cohort_progress/{prn}
    const prn = FirestoreDataService.resolvePrn(uid);
    if (prn) {
      try {
        const cohortRef = doc(db, 'cohort_progress', prn);
        const cohortSnap = await getDoc(cohortRef).catch(() => null);
        const existingData = cohortSnap && cohortSnap.exists() ? cohortSnap.data() : {};
        const prevModule = existingData.moduleProgress || {};
        const computedAcademic = Math.min(100, Math.round(uniqueProblems.length * 20));

        await setDoc(
          cohortRef,
          {
            prn,
            completedProblems: uniqueProblems,
            totalSolved: uniqueProblems.length,
            moduleProgress: {
              ...prevModule,
              academicScore: Math.max(Number(prevModule.academicScore || 0), computedAcademic),
              lastActiveTime: new Date().toISOString(),
            },
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        RealtimeSyncService.emit('USERS');
        RealtimeSyncService.emit('DASHBOARD');
      } catch (err) {
        console.warn('savePracticeProgress to cohort_progress notice:', err);
      }
    }

    // 2. Also persist to users/{uid}/drafts/practice_progress if signed in with Firebase Auth
    if (auth.currentUser?.uid) {
      const targetUid = auth.currentUser.uid;
      try {
        const draftRef = doc(db, 'users', targetUid, 'drafts', 'practice_progress');
        await setDoc(
          draftRef,
          {
            userId: targetUid,
            completedProblems: uniqueProblems,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch {
        // ignore
      }
    }
  }

  /**
   * Tracks question opening: increments attempt counter for a specific topic / problem.
   * Every time student opens a problem (or closes & re-opens), attempt increments by 1.
   */
  public static async recordTopicAttemptOpen(studentIdOrPrn: string, topicId: string): Promise<number> {
    if (!studentIdOrPrn || !topicId) return 1;
    const cleanId = studentIdOrPrn.trim().toUpperCase();
    const storageKey = `logicq_attempts_${cleanId}_${topicId}`;
    let count = 1;
    try {
      const prev = parseInt(localStorage.getItem(storageKey) || '0', 10);
      count = prev + 1;
      localStorage.setItem(storageKey, String(count));
    } catch {}

    try {
      const draftRef = doc(db, 'cohort_progress', cleanId, 'drafts', 'topic_attempts');
      await setDoc(
        draftRef,
        {
          [topicId]: count,
          lastAttemptedTopic: topicId,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Also persist on cohort_progress root so real-time admin listener sees topicAttempts immediately
      await setDoc(
        doc(db, 'cohort_progress', cleanId),
        {
          topicAttempts: {
            [topicId]: count,
          },
          lastAttemptedTopic: topicId,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('recordTopicAttemptOpen Firestore notice:', err);
    }
    return count;
  }

  public static getLocalTopicAttempt(studentIdOrPrn: string, topicId: string): number {
    if (!studentIdOrPrn || !topicId) return 1;
    const cleanId = studentIdOrPrn.trim().toUpperCase();
    try {
      return parseInt(localStorage.getItem(`logicq_attempts_${cleanId}_${topicId}`) || '1', 10);
    } catch {
      return 1;
    }
  }

  /**
   * Reads student practice progress from cohort_progress/{prn} or users/{uid}/drafts/practice_progress
   */
  public static async getPracticeProgress(uid: string): Promise<StudentPracticeProgress | null> {
    const prn = FirestoreDataService.resolvePrn(uid);

    const effectiveUid = auth.currentUser?.uid || uid;
    const localKey = effectiveUid ? `logicq_practice_progress_${effectiveUid}` : 'logicq_practice_progress';
    let localCompleted: string[] = [];
    try {
      const raw = localStorage.getItem(localKey);
      if (raw) localCompleted = JSON.parse(raw);
    } catch {}

    let cloudCompleted: string[] = [];
    let cloudModuleProgress: any = {};
    let cloudUpdatedAt: any = null;

    // 1. Immediate Cross-Device Cloud Sync from cohort_progress/{prn}
    if (prn) {
      try {
        const cohortRef = doc(db, 'cohort_progress', prn);
        const cohortSnap = await getDoc(cohortRef).catch(() => null);
        if (cohortSnap && cohortSnap.exists()) {
          const data = cohortSnap.data();
          if (Array.isArray(data.completedProblems)) {
            cloudCompleted.push(...data.completedProblems);
          }
          if (data.moduleProgress) {
            cloudModuleProgress = { ...cloudModuleProgress, ...data.moduleProgress };
          }
          cloudUpdatedAt = data.updatedAt;
        }
      } catch (err) {
        console.warn('getPracticeProgress from cohort_progress notice:', err);
      }
    }

    // 2. Check users/{uid}/drafts/practice_progress if signed in with Firebase Auth
    if (auth.currentUser?.uid) {
      const primaryUid = auth.currentUser.uid;
      try {
        const draftRef = doc(db, 'users', primaryUid, 'drafts', 'practice_progress');
        const draftSnap = await getDoc(draftRef).catch(() => null);
        if (draftSnap && draftSnap.exists()) {
          const data = draftSnap.data();
          if (Array.isArray(data.completedProblems)) {
            cloudCompleted.push(...data.completedProblems);
          }
          if (data.moduleProgress) {
            cloudModuleProgress = { ...cloudModuleProgress, ...data.moduleProgress };
          }
          if (!cloudUpdatedAt) cloudUpdatedAt = data.updatedAt;
        }
      } catch {}
    }

    const mergedCompleted = Array.from(new Set([...localCompleted, ...cloudCompleted]));
    if (mergedCompleted.length > 0 && localKey) {
      try {
        localStorage.setItem(localKey, JSON.stringify(mergedCompleted));
      } catch {}
    }

    if (mergedCompleted.length > 0) {
      return {
        userId: prn || uid,
        completedProblems: mergedCompleted,
        moduleProgress: cloudModuleProgress,
        updatedAt: cloudUpdatedAt,
      };
    }

    return null;
  }

  /**
   * Persists an immutable backup of student stats in cohort_progress/{prn} and users/{uid}/drafts/stats_backup
   */
  public static async saveStatsBackup(uid: string, stats: Partial<StudentStatsBackup>): Promise<void> {
    const effectiveUid = auth.currentUser?.uid || (uid && uid.length < 32 ? uid : null);
    const localKey = effectiveUid || uid ? `logicq_stats_backup_${effectiveUid || uid}` : null;

    if (localKey) {
      try {
        const prevRaw = localStorage.getItem(localKey);
        const prev = prevRaw ? JSON.parse(prevRaw) : {};
        const merged = {
          ...prev,
          ...stats,
          totalPoints: Math.max(Number(prev.totalPoints || 0), Number(stats.totalPoints || 0)),
          currentStreak: Math.max(Number(prev.currentStreak || 0), Number(stats.currentStreak || 0)),
          longestStreak: Math.max(Number(prev.longestStreak || 0), Number(stats.longestStreak || 0)),
          totalSolved: Math.max(
            Number(prev.totalSolved || 0),
            Number(stats.totalSolved || 0),
            Array.isArray(stats.completedProblems) ? stats.completedProblems.length : 0
          ),
          completedProblems: Array.from(
            new Set([...(prev.completedProblems || []), ...(stats.completedProblems || [])])
          ),
        };
        localStorage.setItem(localKey, JSON.stringify(merged));
      } catch {}
    }

    // 1. Cross-Device Cloud Sync for Cohort Students via cohort_progress/{prn}
    const prn = FirestoreDataService.resolvePrn(uid);
    if (prn) {
      try {
        const cohortRef = doc(db, 'cohort_progress', prn);
        const cohortSnap = await getDoc(cohortRef).catch(() => null);
        const existingData = cohortSnap && cohortSnap.exists() ? cohortSnap.data() : {};
        const mergedPoints = Math.max(Number(existingData.totalPoints || 0), Number(stats.totalPoints || 0));
        const mergedStreak = Math.max(Number(existingData.currentStreak || 0), Number(stats.currentStreak || 0));
        const mergedLongest = Math.max(Number(existingData.longestStreak || 0), Number(stats.longestStreak || 0));
        const mergedSolved = Math.max(
          Number(existingData.totalSolved || 0),
          Number(stats.totalSolved || 0),
          Array.isArray(stats.completedProblems) ? stats.completedProblems.length : 0
        );
        const mergedProblems = Array.from(
          new Set([
            ...(Array.isArray(existingData.completedProblems) ? existingData.completedProblems : []),
            ...(Array.isArray(stats.completedProblems) ? stats.completedProblems : []),
          ])
        );

        const prevModule = existingData.moduleProgress || {};
        const computedAcademic = Math.min(100, Math.round(mergedSolved * 20));

        await setDoc(
          cohortRef,
          {
            prn,
            totalPoints: mergedPoints,
            currentStreak: mergedStreak,
            longestStreak: mergedLongest,
            totalSolved: mergedSolved,
            completedProblems: mergedProblems,
            lastSolvedDate: stats.lastSolvedDate || existingData.lastSolvedDate || new Date().toISOString(),
            moduleProgress: {
              ...prevModule,
              academicScore: Math.max(Number(prevModule.academicScore || 0), computedAcademic),
              lastActiveTime: new Date().toISOString(),
            },
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        RealtimeSyncService.emit('USERS');
        RealtimeSyncService.emit('DASHBOARD');
      } catch (err) {
        console.warn('saveStatsBackup to cohort_progress notice:', err);
      }
    }

    // 2. Also persist to users/{uid}/drafts/stats_backup if signed in with Firebase Auth
    if (!auth.currentUser?.uid) return;
    const targetUid = auth.currentUser.uid;
    try {
      const statsRef = doc(db, 'users', targetUid, 'drafts', 'stats_backup');
      const existing = await getDoc(statsRef).catch(() => null);
      const existingData = existing && existing.exists() ? existing.data() : {};

      const mergedPoints = Math.max(Number(existingData.totalPoints || 0), Number(stats.totalPoints || 0));
      const mergedStreak = Math.max(Number(existingData.currentStreak || 0), Number(stats.currentStreak || 0));
      const mergedLongest = Math.max(Number(existingData.longestStreak || 0), Number(stats.longestStreak || 0));
      const mergedSolved = Math.max(
        Number(existingData.totalSolved || 0),
        Number(stats.totalSolved || 0),
        Array.isArray(stats.completedProblems) ? stats.completedProblems.length : 0
      );
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

      // Keep non-PII publicProfiles mirror in sync for live leaderboard
      try {
        const publicRef = doc(db, 'publicProfiles', targetUid);
        await setDoc(
          publicRef,
          {
            userId: targetUid,
            totalPoints: mergedPoints,
            currentStreak: mergedStreak,
            longestStreak: mergedLongest,
            totalSolved: mergedSolved,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch {}
    } catch {
      // ignore
    }
  }

  /**
   * Retrieves student stats backup from cohort_progress/{prn} or users/{uid}/drafts/stats_backup
   */
  public static async getStatsBackup(uid: string): Promise<StudentStatsBackup | null> {
    const prn = FirestoreDataService.resolvePrn(uid);


    const effectiveUid = auth.currentUser?.uid;
    const localKey = effectiveUid || uid ? `logicq_stats_backup_${effectiveUid || uid}` : null;
    let localData: StudentStatsBackup | null = null;
    if (localKey) {
      try {
        const raw = localStorage.getItem(localKey);
        if (raw) localData = JSON.parse(raw);
      } catch {}
    }

    // 1. Immediate Cross-Device Cloud Sync from cohort_progress/{prn}
    if (prn) {
      try {
        const cohortRef = doc(db, 'cohort_progress', prn);
        const snap = await getDoc(cohortRef).catch(() => null);
        if (snap && snap.exists()) {
          const d = snap.data();
          const remoteData: StudentStatsBackup = {
            userId: prn,
            totalPoints: Math.max(Number(localData?.totalPoints || 0), Number(d.totalPoints || 0)),
            currentStreak: Math.max(Number(localData?.currentStreak || 0), Number(d.currentStreak || 0)),
            longestStreak: Math.max(Number(localData?.longestStreak || 0), Number(d.longestStreak || 0)),
            totalSolved: Math.max(
              Number(localData?.totalSolved || 0),
              Number(d.totalSolved || 0),
              Array.isArray(d.completedProblems) ? d.completedProblems.length : 0
            ),
            completedProblems: Array.from(
              new Set([
                ...(localData?.completedProblems || []),
                ...(Array.isArray(d.completedProblems) ? d.completedProblems : []),
              ])
            ),
            lastSolvedDate: d.lastSolvedDate || localData?.lastSolvedDate || null,
            updatedAt: d.updatedAt,
          };
          if (localKey) {
            try {
              localStorage.setItem(localKey, JSON.stringify(remoteData));
            } catch {}
          }
          return remoteData;
        }
      } catch (err) {
        console.warn('getStatsBackup from cohort_progress notice:', err);
      }
    }

    if (!effectiveUid) return localData;

    try {
      const statsRef = doc(db, 'users', effectiveUid, 'drafts', 'stats_backup');
      const snap = await getDoc(statsRef);
      if (snap.exists()) {
        const d = snap.data();
        const remoteData: StudentStatsBackup = {
          userId: effectiveUid,
          totalPoints: Number(d.totalPoints || 0),
          currentStreak: Number(d.currentStreak || 0),
          longestStreak: Number(d.longestStreak || 0),
          totalSolved: Number(d.totalSolved || 0),
          completedProblems: Array.isArray(d.completedProblems) ? d.completedProblems : [],
          lastSolvedDate: d.lastSolvedDate || null,
          updatedAt: d.updatedAt,
        };
        if (localKey) {
          try {
            localStorage.setItem(localKey, JSON.stringify(remoteData));
          } catch {}
        }
        return remoteData;
      }
      return localData;
    } catch {
      return localData;
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
    if (!auth.currentUser || !uid) {
      return () => {};
    }
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
        if ((error as any)?.code !== 'permission-denied') {
          console.warn('FirestoreDataService.subscribePracticeProgress notice:', error);
        }
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
    const emailCandidate = formatNameFromEmail(email);
    const resolvedFullName = realCandidate || emailCandidate || (isAdmin ? 'LogicQ Admin' : `Student ${shortId}`);
    const resolvedDisplayName = isRealPersonName(data.displayName) ? data.displayName : (isAdmin ? 'Admin' : (realCandidate || emailCandidate || null));

    return {
      id: uid,
      username: (data.username && isRealPersonName(data.username)) ? data.username : (isAdmin ? 'admin' : (email ? email.split('@')[0] : `stu_${shortId.toLowerCase()}`)),
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
      miniProjectUnlocked: Boolean(data.miniProjectUnlocked || data.miniProjectActive),
      isBanned: Boolean(data.isBanned),
      bannedAt: data.bannedAt || null,
      banReason: data.banReason || null,
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
    // Purge deleted / demo accounts in background
    FirestoreDataService.purgeDeletedStudentsFromFirestore().catch(() => {});

    const list: User[] = [];
    const seenEmails = new Set<string>();
    const seenPrns = new Set<string>();

    const currentEmail = (auth.currentUser?.email || '').toLowerCase().trim();
    const isAdmin = [
      'logicqarena@gmail.com',
    ].includes(currentEmail);

    // 1. Fetch from 'users' collection (Admin only - non-admins lack global read permission on /users)
    if (isAdmin) {
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
      } catch (err: any) {
        if (err?.code !== 'permission-denied') {
          console.warn('getAllFirestoreUsers: users collection read skipped/failed:', err);
        }
      }
    }

    // 2. Fetch from 'enrolled_students' collection (guarantees enrolled students are visible in admin roster)
    try {
      const enrolledSnap = await getDocs(collection(db, 'enrolled_students'));
      enrolledSnap.forEach((d) => {
        const raw = d.data();
        if (!raw) return;
        const email = (raw.email || '').toLowerCase().trim();
        const prn = raw.prn ? String(raw.prn).toUpperCase().trim() : null;

        // Enrich existing student if already in list from users collection
        const existingStudent = list.find((u: any) => 
          (email && u.email && u.email.toLowerCase().trim() === email) ||
          (prn && u.prn && u.prn.toUpperCase().trim() === prn)
        );

        if (existingStudent) {
          if (email) {
            existingStudent.email = email;
            (existingStudent as any).isEmailBound = !email.endsWith('@sanjivani.edu.in');
          }
          if (raw.name || raw.fullName || raw.displayName) {
            const rName = raw.name || raw.fullName || raw.displayName;
            existingStudent.fullName = rName;
            existingStudent.displayName = rName;
          }
          if (raw.sectionId && !existingStudent.sectionId) existingStudent.sectionId = raw.sectionId;
          if ((raw.sectionName || raw.subject) && !existingStudent.sectionName) {
            existingStudent.sectionName = raw.sectionName || raw.subject;
          }
          if (raw.department && (!existingStudent.department || existingStudent.department === 'General' || existingStudent.department === '—')) {
            existingStudent.department = normalizeDepartment(raw.department) || raw.department;
          }
          if (raw.year && (!existingStudent.year || existingStudent.year === '—')) existingStudent.year = raw.year;
          if (raw.division && !existingStudent.division) existingStudent.division = raw.division;
          if (!existingStudent.sections) existingStudent.sections = [];
          if (raw.isBanned !== undefined) (existingStudent as any).isBanned = Boolean(raw.isBanned);
          if (raw.bannedAt) (existingStudent as any).bannedAt = raw.bannedAt;
          if (raw.banReason) (existingStudent as any).banReason = raw.banReason;
          if (raw.sectionId && !existingStudent.sections.some((s: any) => s.id === raw.sectionId || s.joinCode === raw.sectionId)) {
            existingStudent.sections.push({
              id: raw.sectionId,
              sectionName: (raw.sectionName && raw.sectionName !== 'Academic Section') ? raw.sectionName : (raw.subject || 'C Programming'),
              joinCode: raw.joinCode || raw.sectionId,
              subject: raw.subject,
              course: raw.course,
            });
          }
          return;
        }

        if (email) seenEmails.add(email);
        if (prn) seenPrns.add(prn);

        const shortId = prn ? prn.slice(-4) : '0000';
        const rawRealName = [raw.displayName, raw.fullName, raw.name].find(isRealPersonName);
        const cleanHuman = rawRealName || formatNameFromEmail(email) || `Student ${shortId}`;
        list.push({
          id: d.id,
          username: raw.username && isRealPersonName(raw.username) ? raw.username : (email ? email.split('@')[0] : `stu_${shortId}`),
          email,
          prn,
          maskedPrn: prn ? `••••••••${shortId}` : '••••••••',
          shortId,
          fullName: cleanHuman,
          displayName: cleanHuman,
          publicDisplayName: cleanHuman,
          role: 'STUDENT',
          college: raw.college || 'Sanjivani University',
          department: normalizeDepartment(raw.department) || raw.department || null,
          year: raw.year || 'SY',
          division: raw.division || null,
          sectionId: raw.sectionId || 'sec-mw6l4r2s',
          sectionName: 'Integrated Mtech',
          sections: [{
            id: raw.sectionId || 'sec-mw6l4r2s',
            sectionName: 'Integrated Mtech',
            joinCode: raw.joinCode || 'LQ-INTE34',
            subject: 'C Programming',
            course: 'Integrated M.Tech',
          }],
          profileComplete: true,
          totalPoints: Number(raw.totalPoints || 0),
          currentStreak: Number(raw.currentStreak || 0),
          longestStreak: Number(raw.longestStreak || 0),
          miniProjectUnlocked: Boolean(raw.miniProjectUnlocked || raw.miniProjectActive),
          isBanned: Boolean(raw.isBanned),
          bannedAt: raw.bannedAt || null,
          banReason: raw.banReason || null,
          createdAt: raw.enrolledAt?.toDate ? raw.enrolledAt.toDate().toISOString() : new Date().toISOString(),
        } as any);
      });
    } catch (err: any) {
      if (err?.code !== 'permission-denied') {
        console.warn('getAllFirestoreUsers: enrolled_students collection read skipped/failed:', err);
      }
    }

    // 2.5 Scan section student rosters (ensures students enrolled directly in sections appear in directory)
    try {
      const fsSections = await FirestoreDataService.getSectionsFromFirestore();
      for (const sec of fsSections) {
        const secStudents = Array.isArray(sec.students) ? sec.students : [];
        for (const st of secStudents) {
          if (!st || FirestoreDataService.isPurgedStudent(st)) continue;
          const email = (st.email || st.student?.email || '').toLowerCase().trim();
          const prn = (st.prn || st.student?.prn) ? String(st.prn || st.student?.prn).toUpperCase().trim() : null;

          const existingStudent = list.find((u: any) => 
            (email && u.email && u.email.toLowerCase().trim() === email) ||
            (prn && u.prn && u.prn.toUpperCase().trim() === prn)
          );

          if (existingStudent) {
            if (sec.id && !existingStudent.sectionId) existingStudent.sectionId = sec.id;
            if ((sec.sectionName || sec.subject) && !existingStudent.sectionName) {
              existingStudent.sectionName = sec.sectionName || sec.subject;
            }
            if (!existingStudent.sections) existingStudent.sections = [];
            if (!existingStudent.sections.some((s: any) => s.id === sec.id || s.joinCode === sec.joinCode)) {
              existingStudent.sections.push({
                id: sec.id,
                sectionName: (sec.sectionName && sec.sectionName !== 'Academic Section') ? sec.sectionName : (sec.name || sec.subject || 'C Programming'),
                joinCode: sec.joinCode || sec.id,
                subject: sec.subject,
                course: sec.course,
              });
            }
            continue;
          }

          if (email) seenEmails.add(email);
          if (prn) seenPrns.add(prn);

          const shortId = prn ? prn.slice(-4) : (email ? email.slice(0, 4) : '0000');
          const rawRealName = [st.displayName, st.fullName, st.name, st.student?.fullName, st.student?.displayName].find(isRealPersonName);
          const cleanHuman = rawRealName || formatNameFromEmail(email) || `Student ${shortId}`;
          list.push({
            id: st.id || st.uid || `sec_stu_${shortId}_${Date.now()}`,
            username: st.username && isRealPersonName(st.username) ? st.username : (email ? email.split('@')[0] : `stu_${shortId}`),
            email,
            prn,
            maskedPrn: prn ? `••••••••${shortId}` : '••••••••',
            shortId,
            fullName: cleanHuman,
            displayName: cleanHuman,
            publicDisplayName: cleanHuman,
            role: 'STUDENT',
            college: st.college || st.institution || 'Sanjivani University',
            department: normalizeDepartment(st.department) || st.department || null,
            year: st.year || 'FY',
            division: st.division || sec.sectionName || null,
            sectionId: sec.id,
            sectionName: (sec.sectionName && sec.sectionName !== 'Academic Section') ? sec.sectionName : (sec.name || sec.subject || 'C Programming'),
            sections: [{
              id: sec.id,
              sectionName: (sec.sectionName && sec.sectionName !== 'Academic Section') ? sec.sectionName : (sec.name || sec.subject || 'C Programming'),
              joinCode: sec.joinCode || sec.id,
              subject: sec.subject,
              course: sec.course,
            }],
            profileComplete: true,
            totalPoints: Number(st.totalPoints ?? st.student?.totalPoints ?? 0),
            currentStreak: Number(st.currentStreak ?? st.student?.currentStreak ?? 0),
            longestStreak: Number(st.longestStreak ?? st.student?.longestStreak ?? 0),
            createdAt: new Date().toISOString(),
          } as any);
        }
      }
    } catch (secErr: any) {
      if (secErr?.code !== 'permission-denied') {
        console.warn('getAllFirestoreUsers section scan skipped/failed:', secErr);
      }
    }

    // 3. Fallback: If empty, try publicProfiles
    if (list.length === 0 && auth.currentUser) {
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
          miniProjectUnlocked: Boolean(raw.miniProjectUnlocked || raw.miniProjectActive),
            createdAt: new Date().toISOString(),
          } as User);
        });
      } catch (pubErr: any) {
        if (pubErr?.code !== 'permission-denied') {
          console.warn('getAllFirestoreUsers publicProfiles fallback failed:', pubErr);
        }
      }
    }

    // Do not inject hardcoded cohort students; only authoritative Firestore enrolled_students & sections are returned.

    list.sort((a: any, b: any) => {
      const prnA = (a.prn || '').trim().toUpperCase();
      const prnB = (b.prn || '').trim().toUpperCase();
      if (!prnA) return 1;
      if (!prnB) return -1;
      const numA = parseInt(prnA.replace(/\D/g, '').slice(-4), 10) || 999999;
      const numB = parseInt(prnB.replace(/\D/g, '').slice(-4), 10) || 999999;
      if (numA !== numB) return numA - numB;
      return prnA.localeCompare(prnB, undefined, { numeric: true, sensitivity: 'base' });
    });

    const filtered = list.filter((u) => !FirestoreDataService.isPurgedStudent(u));
    return filtered;
  }

  /**
   * Retrieves authoritative college leaderboard directly from Firebase Firestore publicProfiles & sections.
   * Ensures offline/dormant students are never dropped from the leaderboard and enforces proper competitive rules
   * (zero points = unranked '—', no fake gold medals).
   */
  public static async getLeaderboardFromFirestore(filters: {
    department?: string;
    year?: string;
    currentUser?: User | null;
  }): Promise<{ leaderboard: any[]; pinnedOwnRow: any; totalSolvers: number }> {
    const list: any[] = [];
    const seenUids = new Set<string>();

    // 1. Fetch from Firestore 'publicProfiles' (Non-PII public mirror, accessible by all authenticated users)
    try {
      const pubSnap = await getDocs(collection(db, 'publicProfiles'));
      pubSnap.forEach((d) => {
        const raw = d.data();
        if (!raw) return;
        const uid = d.id;
        seenUids.add(uid);

        const realName = [raw.displayName, raw.fullName].find(isRealPersonName);
        let cleanName = realName || raw.displayName || raw.fullName || 'Student';

        const finalPoints = Number(raw.totalPoints || 0);
        const finalSolved = Number(raw.totalSolved || (finalPoints > 0 ? Math.max(1, Math.floor(finalPoints / 10)) : 0));

        list.push({
          id: uid,
          userId: uid,
          username: raw.username || cleanName.toLowerCase().replace(/\s+/g, '_'),
          displayName: cleanName,
          fullName: cleanName,
          publicDisplayName: cleanName,
          shortId: raw.shortId || uid.slice(-4),
          college: raw.college || 'Sanjivani University',
          department: normalizeDepartment(raw.department) || raw.department || null,
          year: raw.year || null,
          division: raw.division || null,
          totalPoints: finalPoints,
          currentStreak: Number(raw.currentStreak || 0),
          longestStreak: Number(raw.longestStreak || 0),
          miniProjectUnlocked: Boolean(raw.miniProjectUnlocked || raw.miniProjectActive),
          totalSolved: finalSolved,
        });
      });
    } catch (err: any) {
      if (err?.code !== 'permission-denied') {
        console.warn('getLeaderboardFromFirestore publicProfiles notice:', err);
      }
    }

    // 2. Also incorporate students from active sections (ensures all rostered students appear even if dormant)
    try {
      const secSnap = await getDocs(collection(db, 'sections'));
      secSnap.forEach((d) => {
        const sec = d.data();
        if (!sec || !Array.isArray(sec.students)) return;
        for (const st of sec.students) {
          const uid = st.id || st.uid;
          if (uid && !seenUids.has(uid)) {
            seenUids.add(uid);
            const realName = [st.displayName, st.fullName, st.name].find(isRealPersonName);
            let cleanName = realName || st.displayName || st.fullName || 'Student';
            list.push({
              id: uid,
              userId: uid,
              username: st.username || cleanName.toLowerCase().replace(/\s+/g, '_'),
              displayName: cleanName,
              fullName: cleanName,
              publicDisplayName: cleanName,
              shortId: st.shortId || uid.slice(-4),
              college: st.college || 'Sanjivani University',
              department: normalizeDepartment(st.department) || st.department || null,
              year: st.year || 'FY',
              division: st.division || sec.sectionName || null,
              totalPoints: Number(st.totalPoints || 0),
              currentStreak: 0,
              longestStreak: 0,
              totalSolved: Number(st.totalSolved || (Number(st.totalPoints || 0) > 0 ? 1 : 0)),
            });
          }
        }
      });
    } catch {}

    // 3. Ensure current user is included if authenticated
    const current = filters.currentUser;
    if (current && current.id && !seenUids.has(current.id)) {
      const userPoints = Number(current.totalPoints || 0);
      const userSolved = Number((current as any).totalSolved || (userPoints > 0 ? 1 : 0));

      list.push({
        id: current.id,
        userId: current.id,
        username: current.username || 'student',
        displayName: current.displayName || current.fullName || 'Student',
        fullName: current.fullName || current.displayName || 'Student',
        publicDisplayName: current.displayName || current.fullName || 'Student',
        shortId: current.shortId || (current.prn ? current.prn.slice(-4) : current.id.slice(-4)),
        maskedPrn: current.prn ? maskPrn(current.prn) : undefined,
        college: current.college || 'Sanjivani University',
        department: current.department || null,
        year: current.year || null,
        division: current.division || null,
        totalPoints: userPoints,
        currentStreak: Number(current.currentStreak || 0),
        longestStreak: Number(current.longestStreak || 0),
        totalSolved: userSolved,
      });
    }

    // Filter by department and year
    let filtered = list.filter((u) => !FirestoreDataService.isPurgedStudent(u));
    if (filters.department && filters.department !== 'ALL') {
      filtered = filtered.filter((u) => u.department === filters.department);
    }
    if (filters.year && filters.year !== 'ALL') {
      filtered = filtered.filter((u) => u.year === filters.year);
    }

    // Separate solvers (points > 0 or totalSolved > 0) from unranked (0 points)
    const solvers = filtered.filter((u) => (u.totalPoints || 0) > 0 || (u.totalSolved || 0) > 0);
    const unranked = filtered.filter((u) => (u.totalPoints || 0) === 0 && (u.totalSolved || 0) === 0);

    // Sort solvers: points DESC -> streak DESC -> solved DESC
    solvers.sort((a, b) => {
      if ((b.totalPoints || 0) !== (a.totalPoints || 0)) {
        return (b.totalPoints || 0) - (a.totalPoints || 0);
      }
      if ((b.currentStreak || 0) !== (a.currentStreak || 0)) {
        return (b.currentStreak || 0) - (a.currentStreak || 0);
      }
      return (b.totalSolved || 0) - (a.totalSolved || 0);
    });

    const rankedList: any[] = [];
    solvers.forEach((s, idx) => {
      const rank = idx + 1;
      const studentsBeaten = Math.max(0, solvers.length - rank);
      const percentile = solvers.length <= 1 ? 100 : Math.round(((solvers.length - rank + 1) / solvers.length) * 100);
      rankedList.push({
        ...s,
        rank,
        studentsBeaten,
        percentile,
        isCurrentUser: Boolean(current && s.id === current.id),
      });
    });

    // Unranked students (rank: null, no fake medals!)
    unranked.forEach((u) => {
      rankedList.push({
        ...u,
        rank: null,
        studentsBeaten: 0,
        percentile: null,
        isCurrentUser: Boolean(current && u.id === current.id),
      });
    });

    let pinnedOwnRow = rankedList.find((u) => u.isCurrentUser) || null;
    if (!pinnedOwnRow && current) {
      pinnedOwnRow = {
        id: current.id,
        userId: current.id,
        displayName: current.displayName || current.fullName || 'Student',
        fullName: current.fullName || current.displayName || 'Student',
        publicDisplayName: current.displayName || current.fullName || 'Student',
        shortId: current.shortId || (current.prn ? current.prn.slice(-4) : current.id.slice(-4)),
        maskedPrn: current.prn ? maskPrn(current.prn) : undefined,
        college: current.college || 'Sanjivani University',
        department: current.department || null,
        year: current.year || null,
        division: current.division || null,
        totalPoints: Number(current.totalPoints || 0),
        currentStreak: Number(current.currentStreak || 0),
        longestStreak: Number(current.longestStreak || 0),
        totalSolved: 0,
        rank: null,
        studentsBeaten: 0,
        percentile: null,
        isCurrentUser: true,
      };
    }

    return {
      leaderboard: rankedList,
      pinnedOwnRow,
      totalSolvers: solvers.length,
    };
  }

  public static readonly DELETED_SECTIONS_KEY = 'logicq_deleted_section_ids_v1';

  /**
   * Clears any stale or poisoned section tombstone keys in localStorage while preserving user-deleted sections.
   */
  public static clearStaleSectionTombstones(): void {
    try {
      localStorage.removeItem('logicq_deleted_sections_tombstones');
      localStorage.removeItem('logicq_purge_all_sections_flag_v4');
    } catch {}
  }

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

    // Never consider authoritative active sections (LQ-C31A) as legacy
    if (upperCode === 'LQ-C31A' || upperId === 'LQ-C31A') {
      return false;
    }

    if (upperCode === 'LQ-DEMO' || upperId === 'LQ-DEMO') {
      return true;
    }

    return (
      upperCode === 'LQ-DC85' ||
      upperCode === 'LQ-4904' ||
      upperCode === 'LQ-CE68' ||
      upperCode === 'LQ-56BB' ||
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
        'LQ-DEMO', 'lq-demo',
        'LQ-DC85', 'lq-dc85',
        'LQ-4904', 'lq-4904',
        'LQ-CE68', 'lq-ce68',
        'LQ-56BB', 'lq-56bb',
        'LQ-73E6', 'lq-73e6',
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
        const filtered = existing.filter((s: any) => {
          if (FirestoreDataService.isLegacyDemoSection(s)) return false;
          const sCode = String(s.joinCode || '').toUpperCase().trim();
          if (sCode === 'LQ-73E6' || sCode === 'LQ-DC85' || sCode === 'LQ-56BB') return false;
          return true;
        });
        localStorage.setItem(LOCAL_KEY, JSON.stringify(filtered));
      }

      // 3. Remove section roster cache
      localStorage.removeItem('logicq_section_students_LQ-DC85');
      localStorage.removeItem('logicq_section_students_LQ-4904');
      localStorage.removeItem('logicq_section_students_LQ-CE68');
      localStorage.removeItem('logicq_section_students_LQ-73E6');
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
      await deleteDoc(doc(db, 'sections', 'LQ-73E6')).catch(() => {});
      await deleteDoc(doc(db, 'sections', 'lq-73e6')).catch(() => {});
    } catch (e) {
      console.warn('purgeLegacyDemoSection notice:', e);
    }
  }

  /**
   * Checks if a section has been deleted locally or marked as tombstoned.
   */
  public static isSectionDeleted(sectionId?: string, joinCode?: string, sectionName?: string): boolean {
    if (!sectionId && !joinCode && !sectionName) return false;
    const cleanId = sectionId ? String(sectionId).trim().toUpperCase() : '';
    const cleanCode = joinCode ? String(joinCode).trim().toUpperCase() : '';
    const cleanName = sectionName ? String(sectionName).trim().toUpperCase() : '';

    if (FirestoreDataService.isLegacyDemoSection(sectionId, joinCode)) {
      return true;
    }

    try {
      const raw = localStorage.getItem(FirestoreDataService.DELETED_SECTIONS_KEY);
      if (!raw) return false;
      const list: string[] = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) {
        return list.some((item) => {
          const cleanItem = String(item).trim().toUpperCase();
          return (
            (cleanId && cleanItem === cleanId) ||
            (cleanCode && cleanItem === cleanCode) ||
            (cleanName && cleanItem === cleanName)
          );
        });
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
  public static async deleteSectionFromFirestore(sectionId: string, joinCode?: string, sectionName?: string): Promise<void> {
    if (!sectionId && !joinCode && !sectionName) return;
    const cleanId = sectionId ? String(sectionId).trim() : '';
    const cleanCode = joinCode ? String(joinCode).trim() : '';
    const cleanName = sectionName ? String(sectionName).trim() : '';

    // 1. Mark in permanent deleted tombstones immediately (both upper, lower, and exact)
    try {
      const raw = localStorage.getItem(FirestoreDataService.DELETED_SECTIONS_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      const toAdd = [
        cleanId,
        cleanId.toUpperCase(),
        cleanId.toLowerCase(),
        cleanCode,
        cleanCode.toUpperCase(),
        cleanCode.toLowerCase(),
        cleanName,
        cleanName.toUpperCase(),
        cleanName.toLowerCase(),
      ].filter(Boolean);
      toAdd.forEach((k) => {
        if (!list.includes(k)) list.push(k);
      });
      localStorage.setItem(FirestoreDataService.DELETED_SECTIONS_KEY, JSON.stringify(list));
    } catch {}

    // 2. Remove from local sections backup
    try {
      const LOCAL_KEY = 'logicq_faculty_sections_backup_v2';
      const existing: any[] = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
      if (Array.isArray(existing)) {
        const filtered = existing.filter((s: any) => {
          const sId = String(s.id || s.sectionId || '').toUpperCase().trim();
          const sCode = String(s.joinCode || '').toUpperCase().trim();
          const sName = String(s.sectionName || s.name || '').toUpperCase().trim();
          const targetId = cleanId ? cleanId.toUpperCase() : '';
          const targetCode = cleanCode ? cleanCode.toUpperCase() : '';
          const targetName = cleanName ? cleanName.toUpperCase() : '';
          if (targetId && (sId === targetId || sCode === targetId)) return false;
          if (targetCode && (sCode === targetCode || sId === targetCode)) return false;
          if (targetName && sName === targetName) return false;
          return true;
        });
        localStorage.setItem(LOCAL_KEY, JSON.stringify(filtered));
      }
      localStorage.removeItem('logicq_admin_sections');
    } catch {}

    // 3. Remove local roster cache for this section
    try {
      if (cleanId) {
        localStorage.removeItem(`logicq_section_students_${cleanId}`);
        localStorage.removeItem(`logicq_section_students_${cleanId.toUpperCase()}`);
        localStorage.removeItem(`logicq_section_students_${cleanId.toLowerCase()}`);
      }
      if (cleanCode) {
        localStorage.removeItem(`logicq_section_students_${cleanCode}`);
        localStorage.removeItem(`logicq_section_students_${cleanCode.toUpperCase()}`);
        localStorage.removeItem(`logicq_section_students_${cleanCode.toLowerCase()}`);
      }
      if (cleanName) {
        localStorage.removeItem(`logicq_section_students_${cleanName}`);
        localStorage.removeItem(`logicq_section_students_${cleanName.toUpperCase()}`);
        localStorage.removeItem(`logicq_section_students_${cleanName.toLowerCase()}`);
      }
    } catch {}

    // 4. Delete document(s) from Firestore `sections` collection
    try {
      // 4a. Direct deleteDoc attempts
      if (cleanId) {
        await deleteDoc(doc(db, 'sections', cleanId)).catch(() => {});
        await deleteDoc(doc(db, 'sections', cleanId.toUpperCase())).catch(() => {});
        await deleteDoc(doc(db, 'sections', cleanId.toLowerCase())).catch(() => {});
      }
      if (cleanCode) {
        await deleteDoc(doc(db, 'sections', cleanCode)).catch(() => {});
        await deleteDoc(doc(db, 'sections', cleanCode.toUpperCase())).catch(() => {});
        await deleteDoc(doc(db, 'sections', cleanCode.toLowerCase())).catch(() => {});
      }

      // 4b. Scan all documents in sections collection to purge any doc with matching ID, joinCode, or sectionName
      const snap = await getDocs(collection(db, 'sections'));
      for (const d of snap.docs) {
        const data = d.data() || {};
        const dId = String(d.id).toUpperCase().trim();
        const dataId = String(data.id || '').toUpperCase().trim();
        const dataCode = String(data.joinCode || '').toUpperCase().trim();
        const dataName = String(data.sectionName || data.name || '').toUpperCase().trim();
        const targetId = cleanId ? cleanId.toUpperCase() : '';
        const targetCode = cleanCode ? cleanCode.toUpperCase() : '';
        const targetName = cleanName ? cleanName.toUpperCase() : '';

        const isMatch =
          (targetId && (dId === targetId || dataId === targetId || dataCode === targetId)) ||
          (targetCode && (dId === targetCode || dataId === targetCode || dataCode === targetCode)) ||
          (targetName && (dataName === targetName || dId === targetName));

        if (isMatch) {
          await deleteDoc(d.ref).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('Firestore deleteDoc for section error:', err);
    }

    // 5. Clean up associated enrolled_students in Firestore
    try {
      const snapEnrolled = await getDocs(collection(db, 'enrolled_students'));
      for (const d of snapEnrolled.docs) {
        const data = d.data() || {};
        const secId = String(data.sectionId || '').toUpperCase().trim();
        const jCode = String(data.joinCode || '').toUpperCase().trim();
        const targetId = cleanId ? cleanId.toUpperCase() : '';
        const targetCode = cleanCode ? cleanCode.toUpperCase() : '';
        if (
          (targetId && (secId === targetId || jCode === targetId)) ||
          (targetCode && (secId === targetCode || jCode === targetCode))
        ) {
          await deleteDoc(d.ref).catch(() => {});
        }
      }
    } catch {}

    try {
      RealtimeSyncService.emit('SECTIONS');
      RealtimeSyncService.emit('USERS');
      RealtimeSyncService.emit('DASHBOARD');
    } catch {}
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
        course: (section.course && String(section.course).trim().length > 0) ? String(section.course) : (section.subject || 'C Programming'),
        subject: (section.subject && String(section.subject).trim().length > 0) ? String(section.subject) : 'C Programming',
        sectionName: (section.sectionName && section.sectionName !== 'Academic Section') ? section.sectionName : (section.name || section.subject || 'C Programming'),
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

      try {
        RealtimeSyncService.emit('SECTIONS');
        RealtimeSyncService.emit('DASHBOARD');
      } catch {}
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
    const id = String(student.id || student.uid || '').toLowerCase().trim();
    const name = String(student.name || student.fullName || student.displayName || student.student?.fullName || student.student?.name || '').toLowerCase().trim();

    // Never purge admin or canonical dummy student testing account
    if (
      email === 'logicqarena@gmail.com' ||
      prn === 'LOGICQARENA' ||
      email === 'dummy@logicq.io' ||
      prn === 'DUMMY' ||
      id === 'std_dummy' ||
      id === 'dummy' ||
      name === 'dummy' ||
      name === 'dummy student'
    ) return false;

    // Purge any synthetic candidates (Candidate 2126..., Candidate DEMO..., etc.)
    if (
      name.startsWith('candidate ') ||
      name.includes('candidate 21') ||
      name.includes('candidate demo')
    ) {
      return true;
    }

    // Explicit purge for Demo 1, Demo 2, and all legacy mock test PRNs
    const ghostPrns = [
      'DEMO1', 'DEMO01', 'STD_DEMO1', 'DEMO2',
      '2126PMIM1130', '2199IMTE1001',
      '2026IMTM0001', '2024BCSE0001', '2026VAL1390', '2026JON1390', '2026STUD0001', '2026SIM7208',
      '2199TESM0003', '2199TESF0099', '2199TESF0002',
    ];

    if (
      ghostPrns.includes(prn) ||
      ghostPrns.some((gp) => id === gp.toLowerCase() || id === `stu-${gp.toLowerCase()}`)
    ) {
      return true;
    }

    if (
      email === 'demo1@logicq.io' ||
      email === 'demo2@logicq.io' ||
      email === 'std_demo1@logicq.io' ||
      email === 'ipred1908@gmail.com' ||
      email.endsWith('@logicq.io') ||
      name === 'demo 1' ||
      name === 'demo1' ||
      name === 'demo2' ||
      name === 'demo 2'
    ) {
      return true;
    }

    // Explicit purge for legacy Rohan Sharma test account (keep genuine enrolled students like Jagtap Rohan Sunil safe)
    if (
      name === 'rohan sharma' ||
      name.startsWith('rohan sharma') ||
      email === 'rohan.sharma2026@gmail.com' ||
      email === 'rohan_sharma2026@gmail.com' ||
      email === 'rohan_1390@test.edu' ||
      prn === '2199IMTE1001' ||
      prn.includes('2199IMTE') ||
      id.includes('2199imte')
    ) {
      return true;
    }

    const targetEmails = [
      'hariprasathset@sanjivani.edu.in',
      'faculty@logicq.io',
      'student@logicq.io',
      'rohan_1390@test.edu',
      'join_1390@sanjivani.edu.in',
      'student_2026sim7208@sanjivani.edu.in',
      'rohan.sharma2026@gmail.com',
      'rohan_sharma2026@gmail.com',
      'prnchange.test1@sanjivani.org.in',
      'prnchange.test2@sanjivani.org.in',
      'prn_format_test_1@sanjivani.org.in',
    ];
    const targetPrns = [
      '2199IMTE1001',
      '2026IMTM0001',
      '2024BCSE0001',
      '2026VAL1390',
      '2026JON1390',
      '2026STUD0001',
      '2026SIM7208',
      '2199TESM0003',
      '2199TESF0099',
      '2199TESF0002',
    ];

    return targetEmails.includes(email) || targetPrns.includes(prn);
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
        'demo1@logicq.io',
        'ipred1908@gmail.com',
        'hariprasathset@sanjivani.edu.in',
        'admin@logicq.io',
        'faculty@logicq.io',
        'student@logicq.io',
        'rohan_1390@test.edu',
        'join_1390@sanjivani.edu.in',
        'ipverse1918@gmail.com',
        'ipworker1908@gmail.com',
        'logicq1304@gmail.com',
        'student_2026sim7208@sanjivani.edu.in',
        'rohan.sharma2026@gmail.com',
      'rohan_sharma2026@gmail.com',
      'prnchange.test1@sanjivani.org.in',
        'prnchange.test2@sanjivani.org.in',
        'prn_format_test_1@sanjivani.org.in',
      ];
      const targetPrns = [
        'DEMO1',
        'DEMO01',
        'STD_DEMO1',
        'DEMO2',
        '2126PMIM1130',
        '2199IMTE1001',
        '2026IMTM0001',
        '2024BCSE0001',
        '2026VAL1390',
        '2026JON1390',
        '2026STUD0001',
        '2026SIM7208',
        '2199TESM0003',
        '2199TESF0099',
        '2199TESF0002',
      ];
      const directKeys = [
        'demo1',
        'std_demo1',
        'demo01',
        '2126pmim1130',
        '2126PMIM1130',
        'faculty-walkthrough-1',
        'faculty_instructor',
        'faculty_logicq_io',
        'student-walkthrough-1',
        'student_demo',
        'student_logicq_io',
        'admin-hari-1',
        'admin_hariprasath',
        'hariprasathset_sanjivani_edu_in',
        'admin_logicq_io',
        '2199IMTE1001',
      '2026IMTM0001',
        '2024BCSE0001',
        'rohan_1390_test_edu',
        'join_1390_sanjivani_edu_in',
        'ipverse1918_gmail_com',
        'ipworker1908_gmail_com',
        'logicq1304_gmail_com',
        '2026VAL1390',
        '2026JON1390',
        '2026STUD0001',
        '2026SIM7208',
        '2199TESM0003',
        '2199TESF0099',
        '2199TESF0002',
      ];

      for (const k of directKeys) {
        await deleteDoc(doc(db, 'enrolled_students', k)).catch(() => {});
        await deleteDoc(doc(db, 'cohort_progress', k.toUpperCase())).catch(() => {});
        await deleteDoc(doc(db, 'cohort_progress', k)).catch(() => {});
        await deleteDoc(doc(db, 'publicProfiles', k)).catch(() => {});
        await deleteDoc(doc(db, 'users', k)).catch(() => {});
      }
      for (const prn of targetPrns) {
        await deleteDoc(doc(db, 'prnIndex', prn)).catch(() => {});
        await deleteDoc(doc(db, 'cohort_progress', prn)).catch(() => {});
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
   * Bans a student account. Immediately persists across enrolled_students, cohort_progress, and users.
   */
  public static async banStudent(prn: string, userId?: string, reason: string = 'Violated institutional integrity policy'): Promise<void> {
    const cleanPrn = String(prn || '').toUpperCase().trim();
    const now = new Date().toISOString();

    // 1. Mark in enrolled_students
    if (cleanPrn) {
      await updateDoc(doc(db, 'enrolled_students', cleanPrn), {
        isBanned: true,
        bannedAt: now,
        banReason: reason,
        status: 'BANNED'
      }).catch(async () => {
        await setDoc(doc(db, 'enrolled_students', cleanPrn), {
          isBanned: true,
          bannedAt: now,
          banReason: reason,
          status: 'BANNED'
        }, { merge: true }).catch(() => {});
      });

      await setDoc(doc(db, 'enrolled_students', cleanPrn.toLowerCase()), {
        isBanned: true,
        bannedAt: now,
        banReason: reason,
        status: 'BANNED'
      }, { merge: true }).catch(() => {});
    }

    // 2. Mark in cohort_progress & draft security
    if (cleanPrn) {
      await setDoc(doc(db, 'cohort_progress', cleanPrn), {
        prn: cleanPrn,
        isBanned: true,
        bannedAt: now,
        banReason: reason,
        updatedAt: now
      }, { merge: true }).catch(() => {});

      await setDoc(doc(db, 'cohort_progress', cleanPrn, 'drafts', '__account_security'), {
        isBanned: true,
        bannedAt: now,
        banReason: reason,
        updatedAt: now
      }, { merge: true }).catch(() => {});
    }

    // 3. Mark in users if doc exists or by userId
    const userKeys = [userId, cleanPrn, cleanPrn.toLowerCase(), `std_${cleanPrn.toLowerCase()}`].filter(Boolean) as string[];
    for (const uk of userKeys) {
      await setDoc(doc(db, 'users', uk), {
        isBanned: true,
        bannedAt: now,
        banReason: reason,
        status: 'BANNED',
        updatedAt: now
      }, { merge: true }).catch(() => {});
    }

    // 4. Update local storage cache
    try {
      localStorage.setItem(`logicq_banned_${cleanPrn}`, 'true');
      const cached = localStorage.getItem('logicq_admin_students');
      if (cached) {
        const parsed = JSON.parse(cached);
        const updated = parsed.map((s: any) => {
          if (String(s.prn || '').toUpperCase() === cleanPrn || s.id === userId) {
            return { ...s, isBanned: true, bannedAt: now, banReason: reason };
          }
          return s;
        });
        localStorage.setItem('logicq_admin_students', JSON.stringify(updated));
      }
    } catch {}

    // 5. Broadcast real-time events
    realtimeSync.emit('USERS');
    realtimeSync.emit('SECTIONS');
  }

  /**
   * Resets a student's password back to their institutional PRN
   * and wipes all bound hardware devices so they can log in fresh and register.
   */
  public static async resetStudentPasswordToPrn(prn: string, userId?: string): Promise<boolean> {
    const cleanPrn = String(prn || '').toUpperCase().trim();
    if (!cleanPrn) return false;

    try {
      // 1. Delete custom password credentials from Firestore cohort_progress drafts
      await deleteDoc(doc(db, 'cohort_progress', cleanPrn, 'drafts', '__account_security')).catch(() => {});

      // 2. Clear bound hardware devices in Firestore
      const cohortDoc = await getDoc(doc(db, 'cohort_progress', cleanPrn)).catch(() => null);
      const existingMod = cohortDoc?.data()?.moduleProgress || {};
      await setDoc(
        doc(db, 'cohort_progress', cleanPrn),
        {
          prn: cleanPrn,
          moduleProgress: {
            ...existingMod,
            registeredDevices: [],
          },
          updatedAt: Date.now(),
        },
        { merge: true }
      ).catch(() => {});

      // 3. Clear local storage password and device bindings
      try {
        localStorage.removeItem(`logicq_custom_password_${cleanPrn}`);
        localStorage.removeItem(`logicq_custom_password_${cleanPrn.toLowerCase()}`);
        localStorage.removeItem(`logicq_registered_devices_${cleanPrn}`);
        if (userId) {
          localStorage.removeItem(`logicq_custom_password_${userId}`);
          localStorage.removeItem(`logicq_registered_devices_${userId}`);
        }
      } catch {}

      // 4. Broadcast real-time change
      realtimeSync.emit('USERS');
      realtimeSync.emit('SECTIONS');
      return true;
    } catch (err) {
      console.error('Failed to reset student password to PRN:', err);
      return false;
    }
  }

  /**
   * Unbans a student account.
   */
  public static async unbanStudent(prn: string, userId?: string): Promise<void> {
    const cleanPrn = String(prn || '').toUpperCase().trim();
    const now = new Date().toISOString();

    if (cleanPrn) {
      await updateDoc(doc(db, 'enrolled_students', cleanPrn), {
        isBanned: false,
        bannedAt: null,
        banReason: null,
        status: 'ACTIVE'
      }).catch(async () => {
        await setDoc(doc(db, 'enrolled_students', cleanPrn), {
          isBanned: false,
          bannedAt: null,
          banReason: null,
          status: 'ACTIVE'
        }, { merge: true }).catch(() => {});
      });

      await setDoc(doc(db, 'enrolled_students', cleanPrn.toLowerCase()), {
        isBanned: false,
        bannedAt: null,
        banReason: null,
        status: 'ACTIVE'
      }, { merge: true }).catch(() => {});

      await setDoc(doc(db, 'cohort_progress', cleanPrn), {
        isBanned: false,
        bannedAt: null,
        banReason: null,
        updatedAt: now
      }, { merge: true }).catch(() => {});

      await setDoc(doc(db, 'cohort_progress', cleanPrn, 'drafts', '__account_security'), {
        isBanned: false,
        bannedAt: null,
        banReason: null,
        updatedAt: now
      }, { merge: true }).catch(() => {});
    }

    const userKeys = [userId, cleanPrn, cleanPrn.toLowerCase(), `std_${cleanPrn.toLowerCase()}`].filter(Boolean) as string[];
    for (const uk of userKeys) {
      await setDoc(doc(db, 'users', uk), {
        isBanned: false,
        bannedAt: null,
        banReason: null,
        status: 'ACTIVE',
        updatedAt: now
      }, { merge: true }).catch(() => {});
    }

    try {
      localStorage.removeItem(`logicq_banned_${cleanPrn}`);
      const cached = localStorage.getItem('logicq_admin_students');
      if (cached) {
        const parsed = JSON.parse(cached);
        const updated = parsed.map((s: any) => {
          if (String(s.prn || '').toUpperCase() === cleanPrn || s.id === userId) {
            return { ...s, isBanned: false, bannedAt: null, banReason: null };
          }
          return s;
        });
        localStorage.setItem('logicq_admin_students', JSON.stringify(updated));
      }
    } catch {}

    realtimeSync.emit('USERS');
    realtimeSync.emit('SECTIONS');
  }

  /**
   * Complete Nuclear Unregister & Vanish of a Student Account.
   * Completely purges the student from enrolled_students, cohort_progress (including all drafts),
   * users, publicProfiles, device_sessions, assessment test submissions, and section rosters.
   * Leaves 0 trace on the platform. The student must re-register from scratch via section link if they wish to return.
   */
  public static async unregisterAndPurgeStudent(student: { id?: string; uid?: string; prn?: string; email?: string }): Promise<void> {
    const cleanPrn = String(student.prn || '').toUpperCase().trim();
    const cleanEmail = String(student.email || '').toLowerCase().trim();
    const cleanId = String(student.id || student.uid || '').trim();

    // 1. Delete from enrolled_students
    const enrolledKeys = [
      cleanPrn,
      cleanPrn.toLowerCase(),
      cleanId,
      cleanId.toLowerCase(),
      cleanEmail ? cleanEmail.replace(/[@.]/g, '_') : null,
    ].filter(Boolean) as string[];

    for (const k of enrolledKeys) {
      await deleteDoc(doc(db, 'enrolled_students', k)).catch(() => {});
    }

    // 2. Delete all cohort_progress drafts subcollection documents
    if (cleanPrn) {
      try {
        const draftsSnap = await getDocs(collection(db, 'cohort_progress', cleanPrn, 'drafts')).catch(() => null);
        if (draftsSnap) {
          for (const d of draftsSnap.docs) {
            await deleteDoc(d.ref).catch(() => {});
          }
        }
      } catch {}
      await deleteDoc(doc(db, 'cohort_progress', cleanPrn)).catch(() => {});
      await deleteDoc(doc(db, 'cohort_progress', cleanPrn.toLowerCase())).catch(() => {});
    }

    // 3. Delete from users & publicProfiles
    const userKeys = [
      cleanId,
      cleanPrn,
      cleanPrn.toLowerCase(),
      `std_${cleanPrn.toLowerCase()}`,
      `cohort-${cleanPrn.toLowerCase()}`,
      cleanEmail ? cleanEmail.replace(/[@.]/g, '_') : null,
    ].filter(Boolean) as string[];

    for (const uk of userKeys) {
      await deleteDoc(doc(db, 'users', uk)).catch(() => {});
      await deleteDoc(doc(db, 'publicProfiles', uk)).catch(() => {});
      await deleteDoc(doc(db, 'prnIndex', uk)).catch(() => {});
    }

    // 4. Reset device bindings
    if (cleanPrn) {
      try {
        localStorage.removeItem(`logicq_bound_v2_${cleanPrn}`);
        localStorage.removeItem('logicq_device_id');
        localStorage.removeItem('logicq_session_id');
      } catch {}
    }

    // 5. Delete submissions across assessment_test_submissions and submissions
    try {
      const assessSnap = await getDocs(collection(db, 'assessment_test_submissions')).catch(() => null);
      if (assessSnap) {
        for (const d of assessSnap.docs) {
          const data = d.data();
          const sPrn = String(data.studentPrn || data.prn || '').toUpperCase().trim();
          const sEmail = String(data.studentEmail || data.email || '').toLowerCase().trim();
          const sUid = String(data.userId || data.studentId || '').trim();
          if ((cleanPrn && sPrn === cleanPrn) || (cleanEmail && sEmail === cleanEmail) || (cleanId && sUid === cleanId)) {
            await deleteDoc(d.ref).catch(() => {});
          }
        }
      }
    } catch {}

    try {
      const genSnap = await getDocs(collection(db, 'submissions')).catch(() => null);
      if (genSnap) {
        for (const d of genSnap.docs) {
          const data = d.data();
          const sPrn = String(data.studentPrn || data.prn || '').toUpperCase().trim();
          const sEmail = String(data.studentEmail || data.email || '').toLowerCase().trim();
          const sUid = String(data.userId || data.studentId || '').trim();
          if ((cleanPrn && sPrn === cleanPrn) || (cleanEmail && sEmail === cleanEmail) || (cleanId && sUid === cleanId)) {
            await deleteDoc(d.ref).catch(() => {});
          }
        }
      }
    } catch {}

    // 6. Remove from all sections
    try {
      const sections = await FirestoreDataService.getSectionsFromFirestore();
      for (const sec of sections) {
        if (Array.isArray(sec.students)) {
          const originalLen = sec.students.length;
          const updated = sec.students.filter((st: any) => {
            const stPrn = String(st.prn || st.student?.prn || '').toUpperCase().trim();
            const stEmail = String(st.email || st.student?.email || '').toLowerCase().trim();
            const stId = String(st.id || st.uid || st.studentId || '').trim();
            return !(
              (cleanPrn && stPrn === cleanPrn) ||
              (cleanEmail && stEmail === cleanEmail) ||
              (cleanId && stId === cleanId)
            );
          });
          if (updated.length !== originalLen) {
            sec.students = updated;
            sec.studentsCount = updated.length;
            await FirestoreDataService.saveSectionToFirestore(sec);
          }
        }
      }
    } catch {}

    // 7. Clean all local storage entries
    try {
      if (cleanPrn) {
        localStorage.removeItem(`logicq_custom_password_${cleanPrn}`);
        localStorage.removeItem(`logicq_custom_password_cohort-${cleanPrn.toLowerCase()}`);
        localStorage.removeItem(`logicq_bound_v2_${cleanPrn}`);
        localStorage.removeItem(`logicq_mini_project_unlocked_${cleanPrn}`);
        localStorage.removeItem(`logicq_banned_${cleanPrn}`);
      }
      const cached = localStorage.getItem('logicq_admin_students');
      if (cached) {
        const parsed = JSON.parse(cached);
        const filtered = parsed.filter((s: any) => {
          const sPrn = String(s.prn || '').toUpperCase().trim();
          const sEmail = String(s.email || '').toLowerCase().trim();
          const sId = String(s.id || '').trim();
          return !(
            (cleanPrn && sPrn === cleanPrn) ||
            (cleanEmail && sEmail === cleanEmail) ||
            (cleanId && sId === cleanId)
          );
        });
        localStorage.setItem('logicq_admin_students', JSON.stringify(filtered));
      }
    } catch {}

    // 8. Fire sync events
    realtimeSync.emit('USERS');
    realtimeSync.emit('SECTIONS');
    realtimeSync.emit('DASHBOARD');
  }

  /**
   * Loads all sections persisted in Firestore merged with persistent local cache.
   */
  public static async getSectionsFromFirestore(): Promise<any[]> {
    // Purge deleted students in background
    FirestoreDataService.purgeDeletedStudentsFromFirestore().catch(() => {});

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
      // 2a. Pre-fetch enrolled students from Firestore (enrolled_students collection and users collection)
      const enrolledBySection = new Map<string, any[]>();
      const addEnrolledRecord = (secKey: string, rec: any) => {
        if (!secKey) return;
        const normKey = String(secKey).trim().toUpperCase();
        if (!enrolledBySection.has(normKey)) enrolledBySection.set(normKey, []);
        const arr = enrolledBySection.get(normKey)!;
        const eEmail = (rec.email || rec.student?.email || '').toLowerCase().trim();
        const ePrn = (rec.prn || rec.student?.prn || '').toUpperCase().trim();
        if (!arr.some((ex: any) => (eEmail && (ex.email || '').toLowerCase().trim() === eEmail) || (ePrn && (ex.prn || '').toUpperCase().trim() === ePrn))) {
          arr.push(rec);
        }
      };

      try {
        const enrolledSnap = await getDocs(collection(db, 'enrolled_students'));
        enrolledSnap.forEach((d) => {
          const sData = d.data();
          if (sData && !FirestoreDataService.isPurgedStudent(sData)) {
            const item = { id: d.id, ...sData };
            if (sData.sectionId) addEnrolledRecord(sData.sectionId, item);
            if (sData.joinCode) addEnrolledRecord(sData.joinCode, item);
            if (sData.sectionName) addEnrolledRecord(sData.sectionName, item);
            if (sData.subject) addEnrolledRecord(sData.subject, item);
          }
        });
      } catch (enrErr) {
        console.warn('enrolled_students pre-fetch notice:', enrErr);
      }

      // Also scan users collection for students enrolled in sections (Admin/Faculty only)
      if (auth.currentUser) {
        try {
          const usersSnap = await getDocs(collection(db, 'users'));
          usersSnap.forEach((d) => {
            const uData = d.data();
            if (uData && !FirestoreDataService.isPurgedStudent(uData)) {
              const shortId = uData.prn ? String(uData.prn).slice(-4) : '0000';
              const studentItem = {
                id: d.id,
                userId: d.id,
                name: uData.fullName || uData.displayName || uData.name || `Student ${shortId}`,
                fullName: uData.fullName || uData.displayName || uData.name || `Student ${shortId}`,
                email: (uData.email || '').toLowerCase().trim(),
                prn: uData.prn ? String(uData.prn).toUpperCase().trim() : null,
                department: uData.department || 'General',
                year: uData.year || 'FY',
                status: 'ENROLLED',
              };
              if (uData.sectionId) addEnrolledRecord(uData.sectionId, studentItem);
              if (uData.joinCode) addEnrolledRecord(uData.joinCode, studentItem);
              if (uData.sectionName) addEnrolledRecord(uData.sectionName, studentItem);
              if (Array.isArray(uData.enrolledSections)) {
                uData.enrolledSections.forEach((secId: any) => {
                  if (typeof secId === 'string') addEnrolledRecord(secId, studentItem);
                });
              }
            }
          });
        } catch {
          // Expected permission denial for normal students; ignore quietly without noisy console error
        }
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
            continue;
          }
          const key = item.joinCode || item.id;
          const existing: any = key ? sectionMap.get(key) || {} : {};

          // Resolve enrolled students from local backup, doc payload, or enrolled_students collection
          let studentsList = Array.isArray(item.students) && item.students.length > 0 ? [...item.students] : (Array.isArray(existing.students) ? [...existing.students] : []);
          
          // Check all possible section keys against pre-fetched enrolled rosters
          const candidates = [
            item.id,
            item.joinCode,
            item.joinToken,
            item.sectionName,
            item.subject,
          ].filter(Boolean).map((k: string) => String(k).trim().toUpperCase());

          candidates.forEach((cand) => {
            const found = enrolledBySection.get(cand);
            if (Array.isArray(found)) {
              found.forEach((st: any) => {
                const stEmail = (st.email || st.student?.email || '').toLowerCase().trim();
                const stPrn = (st.prn || st.student?.prn || '').toUpperCase().trim();
                if (!studentsList.some((ex: any) => (stEmail && (ex.email || ex.student?.email || '').toLowerCase().trim() === stEmail) || (stPrn && (ex.prn || ex.student?.prn || '').toUpperCase().trim() === stPrn))) {
                  studentsList.push(st);
                }
              });
            }
          });

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
          const calculatedCount = filteredStudents.length;

          item.students = filteredStudents;
          item.studentsCount = calculatedCount;
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

      // Auto-replicate any locally-saved section to Firestore if missing remotely (skips deleted/legacy sections)
      for (const [, sec] of sectionMap.entries()) {
        if (
          sec &&
          sec.id &&
          !remoteKeys.has(sec.id) &&
          (!sec.joinCode || !remoteKeys.has(sec.joinCode)) &&
          !FirestoreDataService.isSectionDeleted(sec.id, sec.joinCode) &&
          !FirestoreDataService.isLegacyDemoSection(sec)
        ) {
          FirestoreDataService.saveSectionToFirestore(sec).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('getSectionsFromFirestore error:', err);
    }

    // Clean out LQ-IMTC and demo sections
    sectionMap.delete('LQ-IMTC');
    sectionMap.delete('4a8812a1-41eb-4bfb-b50a-ca9f8702ed57');

    let result = Array.from(sectionMap.values())
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
        const finalCount = filteredStudents.length;
        return {
          ...s,
          students: filteredStudents,
          studentsCount: finalCount,
          _count: { students: finalCount },
        };
      });

    // Authoritative Cohort Injection: Check if C Programming was explicitly deleted by admin
    const isCProgDeleted =
      FirestoreDataService.isSectionDeleted('LQ-C31A', 'LQ-C31A', 'C Programming') ||
      FirestoreDataService.isSectionDeleted('C Programming');

    if (isCProgDeleted) {
      result = result.filter(
        (s: any) =>
          String(s.joinCode || '').toUpperCase() !== 'LQ-C31A' &&
          String(s.id || '').toUpperCase() !== 'LQ-C31A' &&
          String(s.sectionName || '').toUpperCase() !== 'C PROGRAMMING'
      );
    } else {
      let cProgSec = result.find(
        (s: any) =>
          s.joinCode === 'LQ-C31A' ||
          s.id === 'LQ-C31A' ||
          s.sectionName === 'C Programming'
      );

      if (cProgSec) {
        const existingStudents = Array.isArray(cProgSec.students) ? [...cProgSec.students] : [];
        const seenPrns = new Set(existingStudents.map((s: any) => (s.prn || '').toUpperCase()));

        C_PROGRAMMING_COHORT_STUDENTS.forEach((cs) => {
          const prnUpper = cs.prn.toUpperCase();
          const validCohortEmail = cs.email || `${cs.prn.toLowerCase()}@sanjivani.edu.in`;
          const existing = existingStudents.find((s: any) => (s.prn || s.student?.prn || '').toUpperCase() === prnUpper);
          if (existing) {
            if (validCohortEmail && (!existing.email || existing.email.endsWith('@sanjivani.edu.in'))) {
              existing.email = validCohortEmail;
              if (existing.student) existing.student.email = validCohortEmail;
            }
            if (cs.fullName && (!existing.name || existing.name === 'Student')) {
              existing.name = cs.fullName;
              existing.fullName = cs.fullName;
              if (existing.student) {
                existing.student.fullName = cs.fullName;
                existing.student.displayName = cs.fullName;
              }
            }
          } else {
            existingStudents.push({
              id: cs.prn,
              uid: cs.prn,
              ...cs,
              email: validCohortEmail,
              name: cs.fullName,
              sectionId: cProgSec.id || 'LQ-C31A',
              enrolledAt: 1730000000000,
              status: 'ACTIVE',
            });
            seenPrns.add(prnUpper);
          }
        });

        cProgSec.students = existingStudents.sort((a: any, b: any) => {
          const prnA = (a.prn || a.student?.prn || '').trim().toUpperCase();
          const prnB = (b.prn || b.student?.prn || '').trim().toUpperCase();
          if (!prnA) return 1;
          if (!prnB) return -1;
          const numA = parseInt(prnA.replace(/\D/g, '').slice(-4), 10) || 999999;
          const numB = parseInt(prnB.replace(/\D/g, '').slice(-4), 10) || 999999;
          if (numA !== numB) return numA - numB;
          return prnA.localeCompare(prnB, undefined, { numeric: true, sensitivity: 'base' });
        });
        cProgSec.studentsCount = Math.max(existingStudents.length, C_PROGRAMMING_COHORT_STUDENTS.length);
        cProgSec._count = { students: cProgSec.studentsCount };

        try {
          localStorage.setItem(`logicq_section_students_${cProgSec.id}`, JSON.stringify(existingStudents));
          if (cProgSec.joinCode) {
            localStorage.setItem(`logicq_section_students_${cProgSec.joinCode}`, JSON.stringify(existingStudents));
          }
        } catch {}
      }
    }

    // Update persistent local backup so fallback always has current valid sections
    try {
      const LOCAL_KEY = 'logicq_faculty_sections_backup_v2';
      localStorage.setItem(LOCAL_KEY, JSON.stringify(result));
    } catch {}

    return result;
  }

  /**
   * Fetches enrolled students for a specific section from Firestore or local cache.
   * Thoroughly searches all section identifiers (ID, joinCode, joinToken) across
   * enrolled_students, users, and persistent caches.
   */
  /**
   * Fetches enrolled students for a specific section from Firestore or local cache.
   * Thoroughly searches all section identifiers (ID, joinCode, joinToken, sectionName, subject)
   * across enrolled_students, users, sections, and persistent caches.
   */
  public static async getEnrolledStudentsForSection(sectionId: string, fallbackSec?: any): Promise<any[]> {
    const list: any[] = [];
    const seen = new Set<string>();

    const targetKey = String(sectionId || '').trim();
    if (!targetKey && !fallbackSec) return [];

    const matchKeys = new Set<string>();
    const addKey = (k?: string | null) => {
      if (!k) return;
      const s = String(k).trim();
      if (!s) return;
      matchKeys.add(s.toUpperCase());
      matchKeys.add(s.toLowerCase());
      matchKeys.add(s);
    };

    addKey(targetKey);

    if (fallbackSec) {
      addKey(fallbackSec.id);
      addKey(fallbackSec.joinCode);
      addKey(fallbackSec.joinToken);
      addKey(fallbackSec.sectionName);
      addKey(fallbackSec.subject);
      if (Array.isArray(fallbackSec.students)) {
        fallbackSec.students.forEach((s: any) => {
          if (!s || FirestoreDataService.isPurgedStudent(s)) return;
          const key = (s.prn || s.email || s.id || '').toUpperCase();
          if (key && !seen.has(key)) {
            seen.add(key);
            list.push(s);
          }
        });
      }
    }

    // Read local section backup to expand matchKeys
    try {
      const LOCAL_KEY = 'logicq_faculty_sections_backup_v2';
      const rawStored = localStorage.getItem(LOCAL_KEY);
      if (rawStored) {
        const stored = JSON.parse(rawStored);
        if (Array.isArray(stored)) {
          stored.forEach((s: any) => {
            if (
              (targetKey && (s.id === targetKey || s.joinCode === targetKey || String(s.joinCode).toUpperCase() === targetKey.toUpperCase())) ||
              (s.id && matchKeys.has(s.id.toUpperCase())) ||
              (s.joinCode && matchKeys.has(s.joinCode.toUpperCase()))
            ) {
              addKey(s.id);
              addKey(s.joinCode);
              addKey(s.joinToken);
              addKey(s.sectionName);
              addKey(s.subject);
              if (Array.isArray(s.students)) {
                s.students.forEach((st: any) => {
                  if (!st || FirestoreDataService.isPurgedStudent(st)) return;
                  const key = (st.prn || st.email || st.id || '').toUpperCase();
                  if (key && !seen.has(key)) {
                    seen.add(key);
                    list.push(st);
                  }
                });
              }
            }
          });
        }
      }
    } catch {}

    // Find section metadata from Firestore sections to gather all possible identifiers
    const allSecs = await FirestoreDataService.getSectionsFromFirestore().catch(() => []);
    const matchedSec = allSecs.find(
      (s: any) =>
        (s.id && (s.id === targetKey || matchKeys.has(String(s.id).toUpperCase()))) ||
        (s.joinCode && (s.joinCode === targetKey || matchKeys.has(String(s.joinCode).toUpperCase()))) ||
        (s.joinToken && (s.joinToken === targetKey || matchKeys.has(String(s.joinToken).toUpperCase())))
    );

    if (matchedSec) {
      addKey(matchedSec.id);
      addKey(matchedSec.joinCode);
      addKey(matchedSec.joinToken);
      addKey(matchedSec.sectionName);
      addKey(matchedSec.subject);
      if (Array.isArray(matchedSec.students)) {
        matchedSec.students.forEach((s: any) => {
          if (!s || FirestoreDataService.isPurgedStudent(s)) return;
          const key = (s.prn || s.email || s.id || '').toUpperCase();
          if (key && !seen.has(key)) {
            seen.add(key);
            list.push(s);
          }
        });
      }
    }

    // 1. Check local backup for all matchKeys
    try {
      for (const k of matchKeys) {
        const raw = localStorage.getItem(`logicq_section_students_${k}`);
        if (raw) {
          const cached = JSON.parse(raw);
          if (Array.isArray(cached)) {
            cached.forEach((s) => {
              if (!s || FirestoreDataService.isPurgedStudent(s)) return;
              const key = (s.prn || s.email || s.id || '').toUpperCase();
              if (key && !seen.has(key)) {
                seen.add(key);
                list.push(s);
              }
            });
          }
        }
      }
    } catch {}

    // 2. Query 'enrolled_students' matching any matchKeys
    try {
      const snap = await getDocs(collection(db, 'enrolled_students'));
      snap.forEach((d) => {
        const data = d.data();
        if (data && !FirestoreDataService.isPurgedStudent(data)) {
          const secId = String(data.sectionId || '').trim().toUpperCase();
          const jCode = String(data.joinCode || '').trim().toUpperCase();
          const secName = String(data.sectionName || '').trim().toUpperCase();
          const subj = String(data.subject || '').trim().toUpperCase();
          if (
            (secId && matchKeys.has(secId)) ||
            (jCode && matchKeys.has(jCode)) ||
            (secName && matchKeys.has(secName)) ||
            (subj && matchKeys.has(subj))
          ) {
            const key = (data.prn || data.email || d.id).toUpperCase();
            if (!seen.has(key)) {
              seen.add(key);
              list.push({ id: d.id, ...data });
            }
          }
        }
      });
    } catch (e) {
      console.warn('getEnrolledStudentsForSection query error:', e);
    }

    // 3. Query 'users' collection to obtain actual registered user profiles & bound emails
    const registeredUsersByPrn = new Map<string, any>();
    const registeredUsersByEmail = new Map<string, any>();

    try {
      const uSnap = await getDocs(collection(db, 'users'));
      uSnap.forEach((d) => {
        const u = d.data();
        if (u && !FirestoreDataService.isPurgedStudent(u)) {
          const uPrn = (u.prn || '').toUpperCase().trim();
          const uEmail = (u.email || '').toLowerCase().trim();
          const userRec = {
            id: d.id,
            userId: d.id,
            ...u,
            email: uEmail,
            prn: uPrn || null,
          };
          if (uPrn) registeredUsersByPrn.set(uPrn, userRec);
          if (uEmail) registeredUsersByEmail.set(uEmail, userRec);

          const uSec = String(u.sectionId || '').trim().toUpperCase();
          const uCode = String(u.joinCode || '').trim().toUpperCase();
          const uName = String(u.sectionName || '').trim().toUpperCase();
          const enrolledList = Array.isArray(u.enrolledSections) ? u.enrolledSections.map((x: any) => String(x).toUpperCase().trim()) : [];
          const matches =
            (uSec && matchKeys.has(uSec)) ||
            (uCode && matchKeys.has(uCode)) ||
            (uName && matchKeys.has(uName)) ||
            enrolledList.some((el: string) => matchKeys.has(el));
          if (matches) {
            const key = (uPrn || uEmail || d.id).toUpperCase();
            if (!seen.has(key)) {
              seen.add(key);
              const shortId = uPrn ? String(uPrn).slice(-4) : '0000';
              const candidateNames = [u.fullName, u.displayName, u.name];
              const resolvedName = candidateNames.find((cand) => cand && typeof cand === 'string' && isRealPersonName(cand)) ||
                (uEmail ? formatNameFromEmail(uEmail) : null) || `Student ${shortId}`;
              list.push({
                id: d.id,
                userId: d.id,
                name: resolvedName,
                fullName: resolvedName,
                displayName: resolvedName,
                email: uEmail,
                prn: uPrn || null,
                department: (u.department && u.department !== 'CSE' ? u.department : null) || deriveDepartmentFromPrn(uPrn) || u.department || 'General',
                year: u.year || 'FY',
                division: u.division || null,
                totalPoints: u.totalPoints || 0,
                solvedCount: u.solvedCount || 0,
                isRegistered: true,
                status: 'ENROLLED',
              });
            }
          }
        }
      });
    } catch {}

    // 4. Merge authoritative C Programming Cohort (all 115 students) if this section matches LQ-C31A
    const isCProgramming =
      matchKeys.has('LQ-C31A') ||
      Array.from(matchKeys).some((k) => k.includes('C PROGRAMMING') || k.includes('LQ-C31A'));

    if (isCProgramming) {
      C_PROGRAMMING_COHORT_STUDENTS.forEach((cs) => {
        const key = cs.prn.toUpperCase();
        if (!seen.has(key)) {
          seen.add(key);
          // Check if student has actual registered profile in users collection
          const realUser = registeredUsersByPrn.get(key) || (cs.email && registeredUsersByEmail.get(cs.email.toLowerCase().trim()));
          const boundLocal = typeof window !== 'undefined' ? localStorage.getItem(`logicq_bound_email_${key}`) : null;
          const candidateEmail = realUser?.email || boundLocal || cs.email || `${cs.prn.toLowerCase()}@sanjivani.edu.in`;
          const actualEmail = candidateEmail;
          const actualName = realUser?.displayName || realUser?.fullName || realUser?.name || cs.fullName;

          list.push({
            id: realUser?.id || cs.prn,
            userId: realUser?.userId || realUser?.id || cs.prn,
            name: actualName,
            fullName: actualName,
            displayName: actualName,
            email: actualEmail,
            isRegistered: true,
            isEmailBound: Boolean(actualEmail && !actualEmail.endsWith('@sanjivani.edu.in')),
            prn: cs.prn,
            department: realUser?.department || cs.department,
            year: realUser?.year || cs.year,
            college: cs.college,
            sectionId: 'LQ-C31A',
            totalPoints: realUser?.totalPoints || 0,
            solvedCount: realUser?.solvedCount || 0,
            status: 'ENROLLED',
          });
        }
      });
    }

    list.sort((a: any, b: any) => {
      const prnA = (a.prn || a.student?.prn || '').trim().toUpperCase();
      const prnB = (b.prn || b.student?.prn || '').trim().toUpperCase();
      if (!prnA) return 1;
      if (!prnB) return -1;
      const numA = parseInt(prnA.replace(/\D/g, '').slice(-4), 10) || 999999;
      const numB = parseInt(prnB.replace(/\D/g, '').slice(-4), 10) || 999999;
      if (numA !== numB) return numA - numB;
      return prnA.localeCompare(prnB, undefined, { numeric: true, sensitivity: 'base' });
    });

    const filtered = list.filter((u) => !FirestoreDataService.isPurgedStudent(u));
    return filtered;
  }

  /**
   * Persists enrolled students to Firestore under 'enrolled_students' collection.
   */
  public static async saveEnrolledStudentsToFirestore(sectionId: string, students: any[]): Promise<void> {
    if (!students || students.length === 0) return;

    // Discover section joinCode and name if available
    let joinCodeResolved: string | null = sectionId.startsWith('LQ-') ? sectionId : null;
    let sectionNameResolved: string | null = null;
    try {
      const LOCAL_KEY = 'logicq_faculty_sections_backup_v2';
      const stored = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
      if (Array.isArray(stored)) {
        const found = stored.find((s: any) => s.id === sectionId || s.joinCode === sectionId);
        if (found) {
          joinCodeResolved = found.joinCode || joinCodeResolved;
          sectionNameResolved = found.sectionName || found.subject || null;
        }
      }
    } catch {}

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
            joinCode: s.joinCode || joinCodeResolved,
            sectionName: s.sectionName || sectionNameResolved,
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
        const prnUpper = s.prn ? String(s.prn).trim().toUpperCase() : null;
        const key = prnUpper || (s.email || s.id || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
        const docRef = doc(db, 'enrolled_students', key);
        const cleanPayload: Record<string, any> = {
          id: s.id || prnUpper || key,
          studentId: s.studentId || prnUpper || key,
          userId: s.userId || s.uid || prnUpper || key,
          uid: s.uid || s.userId || prnUpper || key,
          name: s.name || s.fullName || 'Student',
          fullName: s.name || s.fullName || 'Student',
          displayName: s.displayName || s.name || s.fullName || 'Student',
          prn: prnUpper,
          email: s.email ? String(s.email).trim().toLowerCase() : null,
          sectionId,
          college: s.college || s.institution || 'Sanjivani University',
          institution: s.institution || s.college || 'Sanjivani University',
          course: s.course || 'Integrated M.Tech',
          subject: s.subject || 'C Programming',
          status: 'ACTIVE',
          joinedVia: s.joinedVia || 'INSTANT_JOIN_LINK',
          enrolledAt: s.enrolledAt || new Date().toISOString(),
        };
        if (s.joinCode || joinCodeResolved) cleanPayload.joinCode = s.joinCode || joinCodeResolved;
        if (s.sectionName || sectionNameResolved) cleanPayload.sectionName = s.sectionName || sectionNameResolved;
        if (s.department) cleanPayload.department = String(s.department).trim();
        if (s.year) cleanPayload.year = String(s.year).trim();
        if (s.division) cleanPayload.division = String(s.division).trim();
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
            studentsCount: mergedRoster.length,
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
   * Complete student section enrollment by join code across Firestore,
   * updating enrolled_students, sections.students, and student's profile.
   */
  public static async enrollStudentByCode(
    joinCode: string,
    currentUser: {
      id?: string;
      uid?: string;
      email?: string | null;
      prn?: string | null;
      fullName?: string | null;
      displayName?: string | null;
      department?: string | null;
      year?: string | null;
      college?: string | null;
    }
  ): Promise<{ success: boolean; section: any }> {
    const cleanCode = (joinCode || '').trim().toUpperCase();
    if (!cleanCode) throw new Error('Join code is required.');

    // 1. Locate the section in Firestore or local storage
    const allSecs = await FirestoreDataService.getSectionsFromFirestore();
    let targetSec = allSecs.find(
      (s: any) =>
        (s.joinCode && s.joinCode.toUpperCase() === cleanCode) ||
        (s.joinToken && s.joinToken.toUpperCase() === cleanCode) ||
        s.id === cleanCode
    );

    if (!targetSec) {
      // Direct Firestore document check
      try {
        const q = query(collection(db, 'sections'), where('joinCode', '==', cleanCode));
        const snap = await getDocs(q);
        if (!snap.empty) {
          targetSec = { id: snap.docs[0].id, ...snap.docs[0].data() };
        }
      } catch {}
    }

    if (!targetSec) {
      throw new Error(`Section with code "${cleanCode}" not found. Please verify the code with your faculty.`);
    }

    const effectiveUid = currentUser.id || currentUser.uid || auth.currentUser?.uid;
    const cleanEmail = (currentUser.email || auth.currentUser?.email || '').toLowerCase().trim();
    const cleanPrn = (currentUser.prn || '').toUpperCase().trim();
    const effectiveName = (currentUser.fullName || currentUser.displayName || auth.currentUser?.displayName || 'Student').trim();
    const effectiveDept = normalizeDepartment(currentUser.department) || currentUser.department || 'General';
    const effectiveYear = currentUser.year || 'FY';
    const effectiveCollege = currentUser.college || 'Sanjivani University';

    const studentRecord = {
      id: effectiveUid || `std_${Date.now()}`,
      userId: effectiveUid,
      uid: effectiveUid,
      name: effectiveName,
      fullName: effectiveName,
      displayName: effectiveName,
      email: cleanEmail,
      prn: cleanPrn || null,
      department: effectiveDept,
      year: effectiveYear,
      college: effectiveCollege,
      institution: effectiveCollege,
      sectionId: targetSec.id,
      sectionName: (targetSec.sectionName && targetSec.sectionName !== 'Academic Section') ? targetSec.sectionName : (targetSec.subject || 'C Programming'),
      joinCode: targetSec.joinCode,
      joinedVia: 'JOIN_CODE',
      enrolledAt: new Date().toISOString(),
      status: 'ENROLLED',
    };

    // 2. Persist to enrolled_students collection & section student roster
    await FirestoreDataService.saveEnrolledStudentsToFirestore(targetSec.id, [studentRecord]);
    if (targetSec.joinCode && targetSec.joinCode !== targetSec.id) {
      await FirestoreDataService.saveEnrolledStudentsToFirestore(targetSec.joinCode, [studentRecord]);
    }

    // 3. Update the student's Firestore user document with this section
    if (effectiveUid) {
      try {
        const userRef = doc(db, 'users', effectiveUid);
        await setDoc(
          userRef,
          {
            sectionId: targetSec.id,
            sectionName: targetSec.sectionName || targetSec.subject,
            joinCode: targetSec.joinCode,
            enrolledSections: arrayUnion(targetSec.id),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        const publicRef = doc(db, 'publicProfiles', effectiveUid);
        await setDoc(
          publicRef,
          {
            sectionId: targetSec.id,
            sectionName: targetSec.sectionName || targetSec.subject,
            joinCode: targetSec.joinCode,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        ).catch(() => {});
      } catch (err) {
        console.warn('enrollStudentByCode user doc update notice:', err);
      }
    }

    // 4. Update the parent section document with this student in the students array
    try {
      const secRef = doc(db, 'sections', targetSec.id);
      await setDoc(
        secRef,
        {
          students: arrayUnion(studentRecord),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch {}

    // 5. Update local active user cache
    try {
      const activeRaw = localStorage.getItem('logicq_active_user');
      const activeObj = activeRaw ? JSON.parse(activeRaw) : {};
      const updatedActive = {
        ...activeObj,
        sectionId: targetSec.id,
        sectionName: targetSec.sectionName || targetSec.subject,
        joinCode: targetSec.joinCode,
      };
      localStorage.setItem('logicq_active_user', JSON.stringify(updatedActive));
    } catch {}

    // 6. Broadcast Realtime Sync
    RealtimeSyncService.emit('SECTIONS');
    RealtimeSyncService.emit('USERS');
    RealtimeSyncService.emit('TESTS');

    return { success: true, section: targetSec };
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

      // 0. Immediate Cohort Roster Lookup (Authoritative 115 students)
      const cohortStudent = findCohortStudent(identifier);
      if (cohortStudent && !FirestoreDataService.isPurgedStudent({ ...cohortStudent })) {
        return {
          id: cohortStudent.prn,
          uid: cohortStudent.prn,
          userId: cohortStudent.prn,
          name: cohortStudent.fullName,
          fullName: cohortStudent.fullName,
          displayName: cohortStudent.fullName,
          email: cohortStudent.email,
          prn: cohortStudent.prn,
          department: cohortStudent.department,
          year: cohortStudent.year,
          college: cohortStudent.college,
          sectionId: cohortStudent.sectionId,
          sectionName: cohortStudent.sectionName,
          joinCode: cohortStudent.joinCode,
          role: cohortStudent.role,
          profileComplete: true,
          status: 'ACTIVE',
        };
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

      // 2. Direct lookup by prnIndex/{prnClean} (Only if authenticated in Firebase Auth)
      if (auth.currentUser) {
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
        } catch (err: any) {
          if (err?.code !== 'permission-denied') {
            console.warn('prnIndex lookup error in findEnrolledStudent:', err);
          }
        }
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

      // 5. Query users by PRN or email (Admin only)
      const currentEmail = (auth.currentUser?.email || '').toLowerCase().trim();
      const isAdmin = [
        'logicqarena@gmail.com',
      ].includes(currentEmail);

      if (isAdmin) {
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
      }

      return null;
    } catch (err: any) {
      if (err?.code !== 'permission-denied') {
        console.warn('findEnrolledStudentInFirestore error:', err);
      }
      return null;
    }
  }

  /**
   * Fetches problems stored in Firestore for admins or resilient offline fallback.
   */
  public static async getProblems(): Promise<any[]> {
    if (!auth.currentUser) return [];
    try {
      const snap = await getDocs(collection(db, 'problems')).catch(() => null);
      if (!snap || snap.empty) return [];
      const list: any[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...d.data() });
      });
      return list;
    } catch (err: any) {
      if (err?.code !== 'permission-denied') {
        console.warn('FirestoreDataService.getProblems error:', err);
      }
      return [];
    }
  }

  /**
   * Saves or updates a problem document in Firestore.
   */
  public static async saveProblem(problem: any): Promise<void> {
    if (!auth.currentUser) return;
    try {
      const problemId = problem.id || problem.slug;
      if (!problemId) return;
      await setDoc(doc(db, 'problems', problemId), {
        ...problem,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err: any) {
      if (err?.code !== 'permission-denied') {
        console.warn('FirestoreDataService.saveProblem error:', err);
      }
    }
  }

  /**
   * Deletes a problem document in Firestore.
   */
  public static async deleteProblem(problemId: string): Promise<void> {
    if (!auth.currentUser) return;
    try {
      if (!problemId) return;
      await deleteDoc(doc(db, 'problems', problemId));
    } catch (err: any) {
      if (err?.code !== 'permission-denied') {
        console.warn('FirestoreDataService.deleteProblem error:', err);
      }
    }
  }

  /**
   * Batch syncs an array of problems into Firestore.
   */
  public static async syncProblems(problems: any[]): Promise<void> {
    if (!auth.currentUser) return;
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
    } catch (err: any) {
      if (err?.code !== 'permission-denied') {
        console.warn('FirestoreDataService.syncProblems error:', err);
      }
    }
  }

  /**
   * Retrieves whether the Daily Challenge timer is paused.
   * Default is false (Timer is ON/Active by default).
   */
  public static async getDailyTimerPaused(): Promise<boolean> {
    try {
      const snap = await getDoc(doc(db, 'streak_pauses', 'daily_challenge_timer'));
      if (snap.exists()) {
        const d = snap.data();
        if (typeof d?.paused === 'boolean') {
          return d.paused;
        }
      }
    } catch {}
    try {
      const local = localStorage.getItem('logicq_daily_timer_paused');
      if (local !== null) return local === 'true';
    } catch {}
    return false; // Default: ON / ACTIVE
  }

  /**
   * Updates whether the Daily Challenge timer is paused.
   * Persists to streak_pauses/daily_challenge_timer and localStorage.
   */
  public static async setDailyTimerPaused(paused: boolean): Promise<void> {
    try {
      localStorage.setItem('logicq_daily_timer_paused', String(paused));
    } catch {}
    try {
      await setDoc(
        doc(db, 'streak_pauses', 'daily_challenge_timer'),
        {
          paused,
          isPaused: paused,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('setDailyTimerPaused error:', err);
    }
  }

  /**
   * Computes a normalized integrity score from 0 to 100 based on anti-cheat incidents.
   */
  public static computeIntegrityScore(telemetry: {
    tabSwitchCount?: number;
    copyPasteAttempts?: number;
    fullscreenExits?: number;
    autoLockCount?: number;
  }): number {
    let score = 100;
    score -= (telemetry.tabSwitchCount || 0) * 5;
    score -= (telemetry.copyPasteAttempts || 0) * 10;
    score -= (telemetry.fullscreenExits || 0) * 5;
    score -= (telemetry.autoLockCount || 0) * 20;
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Records a specific proctoring incident (e.g. 3 tab switches auto-lock, copy paste attempt).
   */
  public static async recordProctoringIncident(
    userId: string,
    incident: {
      type: 'EXCEEDED_TAB_SWITCHES' | 'EXCEEDED_COPY_PASTE' | 'TAB_SWITCH' | 'COPY_PASTE' | 'FULLSCREEN_EXIT' | 'SECOND_CHANCE_SUBMISSION';
      problemSlug?: string;
      problemTitle?: string;
      reason: string;
      codeSnippet?: string;
      isCheatAttempt?: boolean;
      tag?: string;
    }
  ): Promise<any> {
    const targetUid = auth.currentUser?.uid || userId || 'current';
    try {
      const existing = await FirestoreDataService.getProctoringTelemetry(targetUid);
      const isAutoLock = incident.type === 'EXCEEDED_TAB_SWITCHES' || incident.type === 'EXCEEDED_COPY_PASTE';
      const autoLockCount = (existing?.autoLockCount || 0) + (isAutoLock ? 1 : 0);
      const tabSwitchCount = Math.max(existing?.tabSwitchCount || 0, incident.type === 'TAB_SWITCH' || incident.type === 'EXCEEDED_TAB_SWITCHES' ? (existing?.tabSwitchCount || 0) + 1 : (existing?.tabSwitchCount || 0));
      const copyPasteAttempts = Math.max(existing?.copyPasteAttempts || 0, incident.type === 'COPY_PASTE' || incident.type === 'EXCEEDED_COPY_PASTE' ? (existing?.copyPasteAttempts || 0) + 1 : (existing?.copyPasteAttempts || 0));
      const fullscreenExits = Math.max(existing?.fullscreenExits || 0, incident.type === 'FULLSCREEN_EXIT' ? (existing?.fullscreenExits || 0) + 1 : (existing?.fullscreenExits || 0));

      const integrityScore = FirestoreDataService.computeIntegrityScore({
        tabSwitchCount,
        copyPasteAttempts,
        fullscreenExits,
        autoLockCount,
      });

      const incidentObj = {
        id: `inc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: incident.type,
        problemSlug: incident.problemSlug || '',
        problemTitle: incident.problemTitle || '',
        reason: incident.reason,
        codeSnippet: incident.codeSnippet ? incident.codeSnippet.slice(0, 500) : '',
        isCheatAttempt: Boolean(incident.isCheatAttempt || incident.type === 'SECOND_CHANCE_SUBMISSION'),
        tag: incident.tag || (incident.type === 'SECOND_CHANCE_SUBMISSION' ? 'TRY_TO_CHEAT' : ''),
        timestamp: new Date().toISOString(),
      };

      const incidents = [incidentObj, ...(existing?.incidents || [])].slice(0, 50);

      const payload = {
        tabSwitchCount,
        copyPasteAttempts,
        fullscreenExits,
        autoLockCount,
        integrityScore,
        incidents,
        lastIncidentAt: incidentObj.timestamp,
        updatedAt: new Date().toISOString(),
      };

      // Always save to localStorage immediately for instant resilience
      try {
        localStorage.setItem('logicq_proctoring_telemetry', JSON.stringify(payload));
        if (targetUid && targetUid !== 'current') {
          localStorage.setItem(`logicq_proctoring_telemetry_${targetUid}`, JSON.stringify(payload));
        }
        RealtimeSyncService.emit('SUBMISSIONS');
      } catch {}

      // Sync to Firestore (only if actively signed in to Firebase Auth)
      try {
        const primaryUid = auth.currentUser?.uid || (userId && userId !== 'current' ? userId : null);
        if (primaryUid) {
          await setDoc(doc(db, 'users', primaryUid, 'drafts', 'proctoring_telemetry'), {
            ...payload,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      } catch (fErr: any) {
        // Log cleanly without noisy alerts if permissions are temporarily unready
        if (fErr?.code !== 'permission-denied') {
          console.warn('recordProctoringIncident Firestore sync warning:', fErr);
        }
      }

      // Cross-Device Cloud Sync for Cohort Students via cohort_progress/{prn} and drafts/proctoring_telemetry
      const prn = FirestoreDataService.resolvePrn(userId || targetUid || undefined);
      if (prn) {
        try {
          const cohortRef = doc(db, 'cohort_progress', prn);
          const cohortSnap = await getDoc(cohortRef).catch(() => null);
          const existingCohort = cohortSnap && cohortSnap.exists() ? cohortSnap.data() : {};
          const prevModule = existingCohort.moduleProgress || {};

          const status = autoLockCount > 0 || copyPasteAttempts > 3
            ? 'CRITICAL_BREACH'
            : (tabSwitchCount > 0 || copyPasteAttempts > 0)
            ? 'NEEDS_REVIEW'
            : 'CLEAN';

          // 1. Authoritative deep forensic timeline draft in subcollection
          try {
            const telemetryDraftRef = doc(db, 'cohort_progress', prn, 'drafts', 'proctoring_telemetry');
            await setDoc(
              telemetryDraftRef,
              {
                code: JSON.stringify({
                  tabSwitchCount,
                  copyPasteAttempts,
                  fullscreenExits,
                  autoLockCount,
                  integrityScore,
                  incidents,
                  lastIncidentAt: incidentObj.timestamp,
                  updatedAt: new Date().toISOString(),
                }),
                problemSlug: 'proctoring_telemetry',
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            );
          } catch (draftErr) {
            console.warn('recordProctoringIncident draft sync notice:', draftErr);
          }

          // 2. Update cohort_progress root document strictly respecting allowedKeys:
          // ['prn', 'completedProblems', 'totalSolved', 'totalPoints', 'moduleProgress', 'updatedAt']
          try {
            await setDoc(
              cohortRef,
              {
                prn,
                moduleProgress: {
                  ...prevModule,
                  integrityScore,
                  tabSwitches: tabSwitchCount,
                  pasteBursts: copyPasteAttempts,
                  fullscreenExits,
                  autoLockCount,
                  status,
                  currentProblem: incident.problemTitle || incident.problemSlug || prevModule.currentProblem || 'Active Practice',
                  currentModule: prevModule.currentModule || 'C Programming Core',
                  lastIncidentAt: incidentObj.timestamp,
                  lastActiveTime: new Date().toISOString(),
                },
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );
          } catch (cohortErr) {
            console.warn('recordProctoringIncident cohort root sync notice:', cohortErr);
          }

          // 3. Mirror directly into enrolled_students for redundant real-time admin sync
          try {
            const enrRef = doc(db, 'enrolled_students', prn);
            await setDoc(enrRef, {
              prn,
              integrityScore,
              tabSwitchCount,
              tabSwitches: tabSwitchCount,
              pasteBursts: copyPasteAttempts,
              copyPasteAttempts,
              updatedAt: serverTimestamp(),
            }, { merge: true });
          } catch (enrErr) {
            console.warn('enrolled_students telemetry sync notice:', enrErr);
          }

          RealtimeSyncService.emit('USERS');
          RealtimeSyncService.emit('DASHBOARD');
          RealtimeSyncService.emit('SUBMISSIONS');
        } catch (cohortErr) {
          console.warn('recordProctoringIncident cohort sync notice:', cohortErr);
        }
      }

      return payload;
    } catch (err) {
      console.warn('recordProctoringIncident error:', err);
      return null;
    }
  }

  /**
   * Synchronizes student live assessment state & telemetry heartbeats directly to Firestore.
   */
  public static async recordStudentLiveTelemetry(
    userId: string,
    data: {
      prn?: string | null;
      studentName?: string | null;
      studentEmail?: string | null;
      testId?: string | null;
      testTitle?: string | null;
      problemId?: string | null;
      problemTitle?: string | null;
      tabSwitchCount: number;
      copyPasteAttempts: number;
      fullScreenExitCount: number;
      totalKeystrokes?: number;
      largestBurstChars?: number;
      activeSec?: number;
      status?: 'IN_PROGRESS' | 'COMPLETED' | 'CRITICAL_BREACH' | 'NEEDS_REVIEW' | 'CLEAN';
      incident?: {
        type: string;
        details: string;
        severity: 'INFO' | 'WARNING' | 'CRITICAL';
        timestamp?: string;
      };
    }
  ): Promise<void> {
    try {
      const prn = (data.prn || FirestoreDataService.resolvePrn(userId || auth.currentUser?.uid || undefined) || '').toUpperCase().trim();
      if (!prn) return;

      const cohortRef = doc(db, 'cohort_progress', prn);
      const cohortSnap = await getDoc(cohortRef).catch(() => null);
      const existingCohort = cohortSnap && cohortSnap.exists() ? cohortSnap.data() : {};
      const prevModule = existingCohort.moduleProgress || {};

      const computedStatus = data.status || (
        data.fullScreenExitCount > 0 || data.copyPasteAttempts > 3
          ? 'CRITICAL_BREACH'
          : (data.tabSwitchCount > 0 || data.copyPasteAttempts > 0)
          ? 'NEEDS_REVIEW'
          : 'CLEAN'
      );

      const autoLockCount = data.fullScreenExitCount > 0 ? 1 : (prevModule.autoLockCount || 0);

      const integrityScore = FirestoreDataService.computeIntegrityScore({
        tabSwitchCount: data.tabSwitchCount,
        copyPasteAttempts: data.copyPasteAttempts,
        fullscreenExits: data.fullScreenExitCount,
        autoLockCount,
      });

      const updatedModule = {
        ...prevModule,
        currentModule: data.testTitle || prevModule.currentModule || 'Continuous Assessment',
        currentProblem: data.problemTitle || prevModule.currentProblem || 'Assessment Question',
        tabSwitches: Math.max(Number(data.tabSwitchCount) || 0, Number(prevModule.tabSwitches) || 0),
        pasteBursts: Math.max(Number(data.copyPasteAttempts) || 0, Number(prevModule.pasteBursts) || 0),
        fullscreenExits: Math.max(Number(data.fullScreenExitCount) || 0, Number(prevModule.fullscreenExits) || 0),
        totalKeystrokes: Math.max(Number(data.totalKeystrokes) || 0, Number(prevModule.totalKeystrokes) || 0),
        largestBurstChars: Math.max(Number(data.largestBurstChars) || 0, Number(prevModule.largestBurstChars) || 0),
        integrityScore,
        status: computedStatus,
        activeSession: true,
        lastActiveTime: new Date().toISOString(),
      };

      await setDoc(cohortRef, {
        prn,
        studentName: data.studentName || existingCohort.studentName,
        studentEmail: data.studentEmail || existingCohort.studentEmail,
        moduleProgress: updatedModule,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      // Mirror to enrolled_students for redundant real-time sync
      try {
        const enrRef = doc(db, 'enrolled_students', prn);
        await setDoc(enrRef, {
          prn,
          integrityScore,
          tabSwitchCount: data.tabSwitchCount,
          tabSwitches: data.tabSwitchCount,
          pasteBursts: data.copyPasteAttempts,
          copyPasteAttempts: data.copyPasteAttempts,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      } catch (enrErr) {
        console.warn('enrolled_students live telemetry sync notice:', enrErr);
      }

      // Subcollection draft for detailed inspection
      const telemetryDraftRef = doc(db, 'cohort_progress', prn, 'drafts', 'proctoring_telemetry');
      const draftSnap = await getDoc(telemetryDraftRef).catch(() => null);
      let incidents: any[] = [];
      if (draftSnap && draftSnap.exists()) {
        try {
          const parsed = JSON.parse(draftSnap.data()?.code || '{}');
          if (Array.isArray(parsed?.incidents)) incidents = parsed.incidents;
        } catch {}
      }

      if (data.incident) {
        incidents.unshift({
          id: `inc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          timestamp: data.incident.timestamp || new Date().toISOString(),
          type: data.incident.type,
          reason: data.incident.details,
          severity: data.incident.severity,
          problemTitle: data.problemTitle,
        });
        incidents = incidents.slice(0, 50);
      }

      await setDoc(telemetryDraftRef, {
        code: JSON.stringify({
          tabSwitchCount: updatedModule.tabSwitches,
          copyPasteAttempts: updatedModule.pasteBursts,
          fullscreenExits: updatedModule.fullscreenExits,
          totalKeystrokes: updatedModule.totalKeystrokes,
          integrityScore,
          incidents,
          testTitle: updatedModule.currentModule,
          problemTitle: updatedModule.currentProblem,
          updatedAt: new Date().toISOString(),
        }),
        problemSlug: 'proctoring_telemetry',
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      RealtimeSyncService.emit('SUBMISSIONS');
      RealtimeSyncService.emit('USERS');
    } catch (err) {
      console.warn('recordStudentLiveTelemetry error:', err);
    }
  }

  /**
   * Resets student proctoring telemetry back to 100/100 verified clean record.
   * Clears infractions, tab switches, paste attempts, fullscreen exits, and all quarantine locks.
   */
  public static async resetProctoringTelemetry(userId?: string): Promise<void> {
    const targetUid = auth.currentUser?.uid || userId || 'current';
    const cleanPayload = {
      tabSwitchCount: 0,
      copyPasteAttempts: 0,
      fullscreenExits: 0,
      autoLockCount: 0,
      integrityScore: 100,
      incidents: [],
      lastIncidentAt: null,
      updatedAt: new Date().toISOString(),
    };

    // 1. Clear local storage telemetry & quarantined problem keys
    try {
      localStorage.setItem('logicq_proctoring_telemetry', JSON.stringify(cleanPayload));
      if (targetUid && targetUid !== 'current') {
        localStorage.setItem(`logicq_proctoring_telemetry_${targetUid}`, JSON.stringify(cleanPayload));
      }
      localStorage.setItem('logicq_proctoring_telemetry_2126PMIM1039', JSON.stringify(cleanPayload));
      localStorage.setItem('logicq_proctoring_telemetry_cohort-2126pmim1039', JSON.stringify(cleanPayload));
      localStorage.setItem('logicq_proctoring_telemetry_2126PMIF1057', JSON.stringify(cleanPayload));
      localStorage.setItem('logicq_proctoring_telemetry_cohort-2126pmif1057', JSON.stringify(cleanPayload));
      
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('logicq_quarantined_') || key === 'logicq_quarantined_modules' || key === 'logicq_quarantined_problems')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {}

    // 2. Clear Firestore document
    const uidsToClear = Array.from(new Set([
      auth.currentUser?.uid,
      userId && userId !== 'current' ? userId : null,
      '2126PMIM1039',
      'cohort-2126pmim1039',
      '2126PMIF1057',
      'cohort-2126pmif1057',
    ])).filter(Boolean) as string[];

    for (const u of uidsToClear) {
      try {
        await setDoc(doc(db, 'users', u, 'drafts', 'proctoring_telemetry'), {
          ...cleanPayload,
          updatedAt: serverTimestamp(),
        });
      } catch (fErr) {
        // notice only
      }
    }

    // 3. Reset cohort_progress/{prn} and drafts/proctoring_telemetry
    const prn = FirestoreDataService.resolvePrn(userId || targetUid || undefined);
    if (prn) {
      try {
        const cohortRef = doc(db, 'cohort_progress', prn);
        const cohortSnap = await getDoc(cohortRef).catch(() => null);
        const existingCohort = cohortSnap && cohortSnap.exists() ? cohortSnap.data() : {};
        const prevModule = existingCohort.moduleProgress || {};

        await setDoc(
          cohortRef,
          {
            prn,
            moduleProgress: {
              ...prevModule,
              integrityScore: 100,
              tabSwitches: 0,
              pasteBursts: 0,
              fullscreenExits: 0,
              autoLockCount: 0,
              status: 'CLEAN',
              lastIncidentAt: null,
              lastActiveTime: new Date().toISOString(),
            },
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        const telemetryDraftRef = doc(db, 'cohort_progress', prn, 'drafts', 'proctoring_telemetry');
        await setDoc(
          telemetryDraftRef,
          {
            code: JSON.stringify(cleanPayload),
            problemSlug: 'proctoring_telemetry',
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        RealtimeSyncService.emit('USERS');
        RealtimeSyncService.emit('DASHBOARD');
      } catch (cohortErr) {
        console.warn('resetProctoringTelemetry cohort notice:', cohortErr);
      }
    }

    // 3. Broadcast real-time sync across open tabs
    RealtimeSyncService.emit('SUBMISSIONS');
    RealtimeSyncService.emit('DASHBOARD');
  }

  /**
   * Completely resets ALL student data back to a brand-new user state:
   * - Deletes all submissions (Cloud Firestore + local storage fallback)
   * - Wipes all solved practice topics (0/100) & lab internal experiments (0/80)
   * - Clears CIE Lab marks (0.0 / 20.0 M)
   * - Wipes all code editor drafts, saved codes, and terminal histories
   * - Resets proctoring telemetry back to 100/100 verified clean record
   * - Clears all quarantined problem locks
   * - Resets Firestore user document stats (solvedCount: 0, points: 0, cieMarks: 0)
   * User identity (PRN, Name, Email, password) is preserved for login.
   */
  public static async resetEntireStudentData(userId?: string | null, prn?: string | null, email?: string | null): Promise<void> {
    const targetUid = auth.currentUser?.uid || userId || 'current';
    const targetPrn = (prn || '2126PMIM1039').trim().toUpperCase();
    const targetEmail = (email || 'thoratpratik2323@gmail.com').trim().toLowerCase();

    // 1. Reset Proctoring Telemetry first
    await this.resetProctoringTelemetry(targetUid);

    // 2. Comprehensive LocalStorage purge for student progress, submissions, drafts, code
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        if (
          key.startsWith('logicq_solved_practice_topics') ||
          key.startsWith('logicq_practice_progress_') ||
          key.startsWith('logicq_stats_backup_') ||
          key.startsWith('logicq_draft_') ||
          key.startsWith('logicq_practice_draft_') ||
          key.startsWith('logicq_saved_code_') ||
          key.startsWith('logicq_practice_code_') ||
          key.startsWith('logicq_compiler_code_') ||
          key.startsWith('logicq_lab_progress_') ||
          key.startsWith('logicq_cie_') ||
          key.startsWith('logicq_cie_marks_') ||
          key.startsWith('logicq_user_progress_') ||
          key.startsWith('logicq_test_attempts_') ||
          key.startsWith('logicq_student_submissions_') ||
          key.startsWith('logicq_quarantined_') ||
          key.startsWith('logicq_history_') ||
          key === 'logicq_fallback_submissions_v1' ||
          key === 'logicq_fallback_practice_progress_v1' ||
          key === 'logicq_solved_practice_topics' ||
          key === 'logicq_recent_submissions' ||
          key === 'logicq_quarantined_modules' ||
          key === 'logicq_quarantined_problems'
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));

      // Set clean baseline structures
      localStorage.setItem('logicq_solved_practice_topics', '[]');
      localStorage.setItem('logicq_fallback_submissions_v1', '[]');
      localStorage.setItem('logicq_fallback_practice_progress_v1', '{}');
      localStorage.setItem('logicq_submissions', '[]');
      localStorage.removeItem('logicq_submissions');
      localStorage.removeItem('logicq_recent_submissions');
    } catch {}

    // 3. Delete all submissions from Cloud Firestore
    const uidsToCheck = Array.from(new Set([
      auth.currentUser?.uid,
      userId && userId !== 'current' ? userId : null,
      targetPrn,
      '2126PMIM1039',
      'cohort-2126pmim1039',
      '2126PMIF1057',
      'cohort-2126pmif1057',
    ])).filter(Boolean) as string[];

    // 3a. Delete cohort_progress from Cloud Firestore
    const prnsToClear = Array.from(new Set([targetPrn, '2126PMIM1039', '2126pmim1039', '2126PMIF1057', '2126pmif1057'])).filter(Boolean);
    for (const p of prnsToClear) {
      try {
        await deleteDoc(doc(db, 'cohort_progress', p)).catch(() => {});
        await deleteDoc(doc(db, 'cohort_progress', p.toUpperCase())).catch(() => {});
        await deleteDoc(doc(db, 'cohort_progress', p.toLowerCase())).catch(() => {});
      } catch {}
    }

    for (const uidVal of uidsToCheck) {
      try {
        const qUser = query(collection(db, 'submissions'), where('userId', '==', uidVal));
        const snap = await getDocs(qUser).catch(() => null);
        if (snap && !snap.empty) {
          for (const docSnap of snap.docs) {
            await deleteDoc(docSnap.ref).catch(() => {});
          }
        }
      } catch {}
    }

    if (targetPrn) {
      try {
        const qPrn = query(collection(db, 'submissions'), where('studentPrn', '==', targetPrn));
        const snap = await getDocs(qPrn).catch(() => null);
        if (snap && !snap.empty) {
          for (const docSnap of snap.docs) {
            await deleteDoc(docSnap.ref).catch(() => {});
          }
        }
      } catch {}
    }

    if (targetEmail) {
      try {
        const qEmail = query(collection(db, 'submissions'), where('studentEmail', '==', targetEmail));
        const snap = await getDocs(qEmail).catch(() => null);
        if (snap && !snap.empty) {
          for (const docSnap of snap.docs) {
            await deleteDoc(docSnap.ref).catch(() => {});
          }
        }
      } catch {}
    }

    // 4. Delete drafts and reset user document progress in Firestore
    for (const uidVal of uidsToCheck) {
      try {
        const draftsSnap = await getDocs(collection(db, 'users', uidVal, 'drafts')).catch(() => null);
        if (draftsSnap && !draftsSnap.empty) {
          for (const d of draftsSnap.docs) {
            if (d.id !== 'proctoring_telemetry') {
              await deleteDoc(d.ref).catch(() => {});
            }
          }
        }

        await setDoc(doc(db, 'users', uidVal, 'progress', 'current'), {
          solvedPracticeTopicIds: [],
          solvedLabProblemSlugs: [],
          cieMarks: 0,
          updatedAt: serverTimestamp(),
        }).catch(() => {});

        await updateDoc(doc(db, 'users', uidVal), {
          solvedCount: 0,
          points: 0,
          cieMarks: 0,
          totalSubmissions: 0,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      } catch {}
    }

    // 5. Broadcast real-time events across all tabs
    RealtimeSyncService.emit('SUBMISSIONS');
    RealtimeSyncService.emit('DASHBOARD');
    RealtimeSyncService.emit('TESTS');
    RealtimeSyncService.emit('SECTIONS');
  }

  /**
   * Save student anti-cheat / proctoring telemetry (tab switches, paste attempts, fullscreen exits).
   * Stored under users/{uid}/drafts/proctoring_telemetry and cached in localStorage.
   */
  public static async saveProctoringTelemetry(
    userId: string,
    data: {
      tabSwitchCount?: number;
      copyPasteAttempts?: number;
      fullscreenExits?: number;
      autoLockCount?: number;
      timeTakenSeconds?: number;
      lastIncidentAt?: string;
    }
  ): Promise<void> {
    const targetUid = auth.currentUser?.uid || userId || 'current';
    try {
      const existing = await FirestoreDataService.getProctoringTelemetry(targetUid);
      const tabSwitchCount = Math.max(existing?.tabSwitchCount || 0, data.tabSwitchCount || 0);
      const copyPasteAttempts = Math.max(existing?.copyPasteAttempts || 0, data.copyPasteAttempts || 0);
      const fullscreenExits = Math.max(existing?.fullscreenExits || 0, data.fullscreenExits || 0);
      const autoLockCount = Math.max(existing?.autoLockCount || 0, data.autoLockCount || 0);
      const integrityScore = FirestoreDataService.computeIntegrityScore({
        tabSwitchCount,
        copyPasteAttempts,
        fullscreenExits,
        autoLockCount,
      });

      const merged = {
        tabSwitchCount,
        copyPasteAttempts,
        fullscreenExits,
        autoLockCount,
        integrityScore,
        incidents: existing?.incidents || [],
        lastIncidentAt: data.lastIncidentAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Always save to localStorage immediately
      try {
        localStorage.setItem('logicq_proctoring_telemetry', JSON.stringify(merged));
        if (userId && userId !== 'current') {
          localStorage.setItem(`logicq_proctoring_telemetry_${userId}`, JSON.stringify(merged));
        }
      } catch {}

      // 1. Authoritative Cross-Device Cohort Telemetry sync (works for all PRN students)
      const prn = (FirestoreDataService.resolvePrn(userId) || (typeof userId === 'string' ? userId.replace(/^cohort-/, '').toUpperCase() : '')).trim();
      if (prn && prn.length >= 6) {
        try {
          await setDoc(doc(db, 'cohort_progress', prn, 'drafts', 'proctoring_telemetry'), {
            code: JSON.stringify(merged),
            updatedAt: serverTimestamp(),
            problemSlug: 'proctoring_telemetry',
          }, { merge: true });
        } catch (cErr: any) {
          console.warn('saveProctoringTelemetry cohort draft sync notice:', cErr);
        }

        try {
          await updateDoc(doc(db, 'cohort_progress', prn), {
            'moduleProgress.tabSwitches': tabSwitchCount,
            'moduleProgress.pasteBursts': copyPasteAttempts,
            'moduleProgress.integrityScore': integrityScore,
            'moduleProgress.lastIncidentAt': merged.lastIncidentAt,
            updatedAt: serverTimestamp(),
          });
        } catch (mErr: any) {
          console.warn('saveProctoringTelemetry cohort module update notice:', mErr);
        }
      }

      // 2. Sync to Firestore users subcollection if signed in via Firebase Auth
      try {
        const primaryUid = auth.currentUser?.uid;
        if (primaryUid) {
          await setDoc(doc(db, 'users', primaryUid, 'drafts', 'proctoring_telemetry'), {
            ...merged,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        }
      } catch (fErr: any) {
        if (fErr?.code !== 'permission-denied') {
          console.warn('saveProctoringTelemetry Firestore sync warning:', fErr);
        }
      }
    } catch (err) {
      console.warn('saveProctoringTelemetry error:', err);
    }
  }

  /**
   * Get student anti-cheat / proctoring telemetry with instant local fallback.
   */
  public static async getProctoringTelemetry(userId?: string): Promise<{
    tabSwitchCount: number;
    copyPasteAttempts: number;
    fullscreenExits: number;
    autoLockCount: number;
    integrityScore: number;
    lastIncidentAt?: string;
    incidents: Array<{
      id: string;
      type: string;
      problemSlug?: string;
      problemTitle?: string;
      reason: string;
      codeSnippet?: string;
      timestamp: string;
    }>;
  } | null> {
    let localData: any = null;
    try {
      const raw = (userId && localStorage.getItem(`logicq_proctoring_telemetry_${userId}`)) || 
                  localStorage.getItem('logicq_proctoring_telemetry');
      if (raw) {
        localData = JSON.parse(raw);
      }
    } catch {}

    const targetUid = auth.currentUser?.uid || (userId && userId !== 'current' ? userId : null);
    let remoteData: any = null;
    if (targetUid) {
      try {
        const snap = await getDoc(doc(db, 'users', targetUid, 'drafts', 'proctoring_telemetry'));
        if (snap.exists()) {
          remoteData = snap.data();
        }
      } catch {}
    }

    // Cross-Device Cohort Telemetry lookup (publicly readable)
    const prn = FirestoreDataService.resolvePrn(userId || targetUid || undefined);
    if (prn && !remoteData) {
      try {
        const draftSnap = await getDoc(doc(db, 'cohort_progress', prn, 'drafts', 'proctoring_telemetry')).catch(() => null);
        if (draftSnap && draftSnap.exists()) {
          const rawCode = draftSnap.data()?.code;
          if (rawCode) remoteData = JSON.parse(rawCode);
        } else {
          const cohortSnap = await getDoc(doc(db, 'cohort_progress', prn)).catch(() => null);
          if (cohortSnap && cohortSnap.exists()) {
            const mod = cohortSnap.data()?.moduleProgress;
            if (mod) {
              remoteData = {
                tabSwitchCount: mod.tabSwitches || 0,
                copyPasteAttempts: mod.pasteBursts || 0,
                fullscreenExits: mod.fullscreenExits || 0,
                autoLockCount: mod.autoLockCount || 0,
                integrityScore: mod.integrityScore ?? 100,
                lastIncidentAt: mod.lastIncidentAt,
                incidents: [],
              };
            }
          }
        }

        // Also check enrolled_students as a robust secondary source
        if (!remoteData || remoteData.tabSwitchCount === 0) {
          const enrSnap = await getDoc(doc(db, 'enrolled_students', prn)).catch(() => null);
          if (enrSnap && enrSnap.exists()) {
            const eData = enrSnap.data();
            if (eData?.tabSwitchCount || eData?.tabSwitches || eData?.integrityScore !== undefined) {
              const eTabs = Number(eData.tabSwitchCount || eData.tabSwitches) || 0;
              const ePastes = Number(eData.pasteBursts || eData.copyPasteAttempts) || 0;
              if (eTabs > 0 || ePastes > 0 || eData.integrityScore < 100) {
                remoteData = {
                  tabSwitchCount: Math.max(eTabs, remoteData?.tabSwitchCount || 0),
                  copyPasteAttempts: Math.max(ePastes, remoteData?.copyPasteAttempts || 0),
                  fullscreenExits: remoteData?.fullscreenExits || 0,
                  autoLockCount: 0,
                  integrityScore: eData.integrityScore ?? Math.max(0, 100 - eTabs * 5 - ePastes * 10),
                  incidents: remoteData?.incidents || [],
                };
              }
            }
          }
        }
      } catch {}
    }

    if (!localData && !remoteData) {
      return null;
    }

    const tabSwitchCount = Math.max(Number(localData?.tabSwitchCount || 0), Number(remoteData?.tabSwitchCount || 0));
    const copyPasteAttempts = Math.max(Number(localData?.copyPasteAttempts || 0), Number(remoteData?.copyPasteAttempts || 0));
    const fullscreenExits = Math.max(Number(localData?.fullscreenExits || 0), Number(remoteData?.fullscreenExits || 0));
    const autoLockCount = Math.max(Number(localData?.autoLockCount || 0), Number(remoteData?.autoLockCount || 0));

    const localIncidents = Array.isArray(localData?.incidents) ? localData.incidents : [];
    const remoteIncidents = Array.isArray(remoteData?.incidents) ? remoteData.incidents : [];
    const incidentMap = new Map<string, any>();
    [...remoteIncidents, ...localIncidents].forEach((inc) => {
      if (inc && (inc.id || inc.timestamp)) {
        incidentMap.set(inc.id || `${inc.timestamp}_${inc.reason}`, inc);
      }
    });
    const incidents = Array.from(incidentMap.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const integrityScore = FirestoreDataService.computeIntegrityScore({
      tabSwitchCount,
      copyPasteAttempts,
      fullscreenExits,
      autoLockCount,
    });

    return {
      tabSwitchCount,
      copyPasteAttempts,
      fullscreenExits,
      autoLockCount,
      integrityScore,
      lastIncidentAt: remoteData?.lastIncidentAt || localData?.lastIncidentAt,
      incidents,
    };
  }

  /**
   * High-scale non-blocking student presence heartbeat.
   * Updates publicProfiles/{uid} with live timestamp, online flag, and current route.
   * Concurrency safe for 120+ students on campus networks.
   */
  public static async updateStudentPresence(uid: string, pagePath?: string): Promise<void> {
    const effectiveUid = auth.currentUser?.uid || uid;
    if (!effectiveUid || !auth.currentUser) return;
    try {
      const publicRef = doc(db, 'publicProfiles', effectiveUid);
      const currentPath = pagePath || (typeof window !== 'undefined' ? window.location.pathname : '/');
      await setDoc(
        publicRef,
        {
          userId: effectiveUid,
          isOnline: true,
          lastActiveAt: serverTimestamp(),
          lastActiveEpochMs: Date.now(),
          currentPage: currentPath,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch {
      // Non-blocking silent catch: presence ping should never impact user experience
    }
  }

  /**
   * Timed Assessment Tests Architecture (cross-device Firestore primary)
   */
  public static async getAssessmentTestsFromFirestore(): Promise<any[]> {
    try {
      const snap = await getDocs(collection(db, 'assessment_tests'));
      const tests: any[] = [];
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        tests.push({ ...d, id: docSnap.id });
      });
      // Synchronize local cache with the authoritative Firestore state
      try {
        localStorage.setItem('logicq_assessment_tests_backup_v1', JSON.stringify(tests));
      } catch {}
      return tests;
    } catch (err) {
      console.warn('Failed to fetch assessment tests from Firestore, using local fallback:', err);
      try {
        const local = localStorage.getItem('logicq_assessment_tests_backup_v1');
        if (!local) return [];
        const parsed = JSON.parse(local);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
  }

  public static async saveAssessmentTestToFirestore(test: any): Promise<void> {
    if (!test || !test.id) return;
    try {
      const cleanTest: Record<string, any> = {
        id: String(test.id),
        title: String(test.title || 'Assessment Test'),
        sectionTarget: String(test.sectionTarget || test.sectionId || 'All'),
        sectionId: String(test.sectionId || test.sectionTarget || 'All'),
        status: String(test.status || 'ACTIVE'),
        durationMinutes: Number(test.durationMinutes) || 60,
        totalMarks: Number(test.totalMarks) || 20,
        antiCheatingRotation: Boolean(test.antiCheatingRotation ?? true),
        randomiseQuestions: Boolean(test.randomiseQuestions ?? true),
        lockOnSubmit: Boolean(test.lockOnSubmit ?? true),
        selectionMode: String(test.selectionMode || 'UNITS'),
        difficultyProfile: String(test.difficultyProfile || 'BALANCED'),
        questionCount: test.questionCount ?? 2,
        questions: Array.isArray(test.questions) ? test.questions : [],
        unitTarget: test.unitTarget ?? 'ALL',
        createdAt: test.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      if (test.section) cleanTest.section = test.section;
      if (test.moduleId) cleanTest.moduleId = String(test.moduleId);
      if (test._count) cleanTest._count = test._count;
      if (test.activeStudents !== undefined) cleanTest.activeStudents = Number(test.activeStudents) || 0;
      if (test.totalEnrolled !== undefined) cleanTest.totalEnrolled = Number(test.totalEnrolled) || 0;
      if (test.suspiciousEvents !== undefined) cleanTest.suspiciousEvents = Number(test.suspiciousEvents) || 0;

      await setDoc(doc(db, 'assessment_tests', test.id), cleanTest, { merge: true });
    } catch (err) {
      console.warn('Error saving assessment test to Firestore:', err);
    }
  }

  public static async deleteAssessmentTestFromFirestore(testId: string): Promise<void> {
    if (!testId) return;
    try {
      await deleteDoc(doc(db, 'assessment_tests', testId));
    } catch (err) {
      console.warn('Error deleting assessment test from Firestore:', err);
    }
  }

  public static listenToAssessmentTests(callback: (tests: any[]) => void): () => void {
    try {
      const q = collection(db, 'assessment_tests');
      return onSnapshot(
        q,
        (snap) => {
          const tests: any[] = [];
          snap.forEach((docSnap) => {
            tests.push({ ...docSnap.data(), id: docSnap.id });
          });
          try {
            localStorage.setItem('logicq_assessment_tests_backup_v1', JSON.stringify(tests));
          } catch {}
          callback(tests);
        },
        (err) => {
          console.warn('Live assessment tests listener error:', err);
        }
      );
    } catch {
      return () => {};
    }
  }

  /**
   * Records a complete assessment test submission along with full proctoring telemetry & incident logs
   */
  public static async recordAssessmentSubmission(submission: any): Promise<void> {
    try {
      if (!submission) return;
      const subId = `asub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const isLate = Boolean(submission.isLate || submission.lateStatus === 'LATE');
      const maxMarks = Number(submission.maxMarks || 10);
      const earnedScore = isLate ? 0 : Number(submission.academicScore ?? submission.marksAwarded ?? maxMarks);

      const cleanSub = {
        id: subId,
        testId: String(submission.testId || submission.assignmentId || 'UNIT'),
        assignmentId: String(submission.assignmentId || submission.testId || 'UNIT'),
        testTitle: submission.testTitle || 'UNIT',
        userId: submission.userId || auth.currentUser?.uid || 'anonymous',
        studentName: submission.studentName || 'Student',
        studentPrn: (submission.studentPrn || submission.prn || '').toUpperCase().trim(),
        studentEmail: (submission.studentEmail || submission.email || '').toLowerCase().trim(),
        problemId: submission.problemId || 'q1',
        problemTitle: submission.problemTitle || 'Assessment Question',
        code: submission.code || '',
        verdict: submission.verdict || (isLate ? 'LATE_ACCEPTED' : 'ACCEPTED'),
        academicScore: earnedScore,
        score: earnedScore,
        marksAwarded: earnedScore,
        maxMarks,
        isLate,
        lateStatus: isLate ? 'LATE' : 'ON_TIME',
        manualGradingRequired: isLate || Boolean(submission.manualGradingRequired),
        allocatedDurationMinutes: Number(submission.allocatedDurationMinutes || 0),
        timeLimitSeconds: Number(submission.timeLimitSeconds || 0),
        attemptNumber: Number(submission.attemptNumber || 1),
        timeTakenSeconds: Number(submission.timeTakenSeconds) || 0,
        tabSwitchCount: Number(submission.tabSwitchCount) || 0,
        copyPasteAttempts: Number(submission.copyPasteAttempts) || 0,
        cutAttempts: Number(submission.cutAttempts) || 0,
        contextMenuAttempts: Number(submission.contextMenuAttempts) || 0,
        fullscreenExits: Number(submission.fullscreenExits || submission.fullScreenExitCount) || 0,
        totalKeystrokes: Number(submission.totalKeystrokes) || 0,
        largestBurstChars: Number(submission.largestBurstChars) || 0,
        incidents: Array.isArray(submission.incidents) ? submission.incidents : [],
        submittedAt: new Date().toISOString(),
        createdAt: serverTimestamp(),
      };

      // 1. Write to assessment_test_submissions
      try {
        await addDoc(collection(db, 'assessment_test_submissions'), cleanSub);
      } catch (err) {
        console.warn('Firestore assessment_test_submissions write notice:', err);
      }

      // 2. Also mirror to submissions for global admin oversight
      try {
        await addDoc(collection(db, 'submissions'), {
          ...cleanSub,
          submissionType: 'ASSESSMENT',
        });
      } catch (err) {
        console.warn('Firestore submissions mirror notice:', err);
      }

      // 3. Cache locally for offline resilience
      try {
        const local = JSON.parse(localStorage.getItem('logicq_assessment_submissions') || '[]');
        local.unshift(cleanSub);
        localStorage.setItem('logicq_assessment_submissions', JSON.stringify(local.slice(0, 100)));
      } catch {}

      // 4. Update cohort_progress and forensic telemetry subcollection for live admin oversight
      const prn = cleanSub.studentPrn || FirestoreDataService.resolvePrn(cleanSub.userId);
      if (prn) {
        try {
          const cohortRef = doc(db, 'cohort_progress', prn);
          const autoLockCount = cleanSub.fullscreenExits > 0 ? 1 : 0;
          const status = autoLockCount > 0 || cleanSub.copyPasteAttempts > 3
            ? 'CRITICAL_BREACH'
            : (cleanSub.tabSwitchCount > 0 || cleanSub.copyPasteAttempts > 0)
            ? 'NEEDS_REVIEW'
            : 'CLEAN';

          const integrityScore = FirestoreDataService.computeIntegrityScore({
            tabSwitchCount: cleanSub.tabSwitchCount,
            copyPasteAttempts: cleanSub.copyPasteAttempts,
            fullscreenExits: cleanSub.fullscreenExits,
            autoLockCount,
          });

          await setDoc(
            cohortRef,
            {
              prn,
              studentName: cleanSub.studentName,
              studentEmail: cleanSub.studentEmail,
              moduleProgress: {
                currentModule: cleanSub.testTitle || 'Continuous Assessment',
                currentProblem: cleanSub.problemTitle || 'Assessment Question',
                tabSwitches: cleanSub.tabSwitchCount,
                pasteBursts: cleanSub.copyPasteAttempts,
                fullscreenExits: cleanSub.fullscreenExits,
                totalKeystrokes: cleanSub.totalKeystrokes,
                integrityScore,
                status,
                lastActiveTime: cleanSub.submittedAt,
                submittedAt: cleanSub.submittedAt,
                testStatus: 'SUBMITTED',
                academicScore: cleanSub.academicScore,
                verdict: cleanSub.verdict,
                activeSession: false,
              },
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );

          const telemetryDraftRef = doc(db, 'cohort_progress', prn, 'drafts', 'proctoring_telemetry');
          await setDoc(
            telemetryDraftRef,
            {
              code: JSON.stringify({
                tabSwitchCount: cleanSub.tabSwitchCount,
                copyPasteAttempts: cleanSub.copyPasteAttempts,
                fullscreenExits: cleanSub.fullscreenExits,
                totalKeystrokes: cleanSub.totalKeystrokes,
                integrityScore,
                incidents: cleanSub.incidents,
                testTitle: cleanSub.testTitle,
                problemTitle: cleanSub.problemTitle,
                code: cleanSub.code,
                submittedAt: cleanSub.submittedAt,
                updatedAt: cleanSub.submittedAt,
              }),
              problemSlug: 'proctoring_telemetry',
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (cohortErr) {
          console.warn('recordAssessmentSubmission cohort sync notice:', cohortErr);
        }
      }

      RealtimeSyncService.emit('SUBMISSIONS');
      RealtimeSyncService.emit('USERS');
      RealtimeSyncService.emit('DASHBOARD');
    } catch (err) {
      console.warn('recordAssessmentSubmission error:', err);
    }
  }

  /**
   * Fetches all submissions matching a specific assessment test
   */
  public static async getAssessmentSubmissions(testId?: string): Promise<any[]> {
    try {
      const list: any[] = [];
      try {
        const snap = await getDocs(collection(db, 'assessment_test_submissions'));
        snap.forEach((d) => {
          const data = d.data();
          if (!testId || data.testId === testId || data.assignmentId === testId) {
            list.push({ id: d.id, ...data });
          }
        });
      } catch {}

      // Fallback from general submissions
      if (list.length === 0) {
        try {
          const genSnap = await getDocs(collection(db, 'submissions'));
          genSnap.forEach((d) => {
            const data = d.data();
            if (data && (data.submissionType === 'ASSESSMENT' || (testId && (data.testId === testId || data.assignmentId === testId)))) {
              list.push({ id: d.id, ...data });
            }
          });
        } catch {}
      }

      // Merge with local fallback
      try {
        const local = JSON.parse(localStorage.getItem('logicq_assessment_submissions') || '[]');
        if (Array.isArray(local)) {
          local.forEach((item: any) => {
            if ((!testId || item.testId === testId || item.assignmentId === testId) && !list.some((x) => x.id === item.id)) {
              list.push(item);
            }
          });
        }
      } catch {}

      return list;
    } catch (err) {
      console.warn('getAssessmentSubmissions notice:', err);
      try {
        return JSON.parse(localStorage.getItem('logicq_assessment_submissions') || '[]');
      } catch {
        return [];
      }
    }
  }

  /**
   * Live real-time listener for assessment test submissions
   */
  public static listenToAssessmentSubmissions(testId: string, callback: (subs: any[]) => void): () => void {
    try {
      const q = collection(db, 'assessment_test_submissions');
      return onSnapshot(
        q,
        (snap) => {
          const list: any[] = [];
          snap.forEach((d) => {
            const data = d.data();
            if (!testId || data.testId === testId || data.assignmentId === testId) {
              list.push({ id: d.id, ...data });
            }
          });
          callback(list);
        },
        (err) => {
          console.warn('Live assessment submissions listener notice:', err);
        }
      );
    } catch {
      return () => {};
    }
  }
}
