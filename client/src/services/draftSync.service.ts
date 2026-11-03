import { doc, getDoc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase.js';
import { FirestoreDataService } from './firestoreData.service.js';

export interface DraftData {
  problemId?: string;
  problemSlug: string;
  code: string;
  customInput?: string;
  updatedAt: number; // Unix epoch ms
  deviceLabel: string;
  expiresAt?: number | null; // Unix epoch ms (for daily challenges)
}

export interface ConflictInfo {
  localDraft: DraftData;
  remoteDraft: DraftData;
}

const MAX_DRAFT_SIZE_BYTES = 64 * 1024; // 64 KB safety limit

/**
 * Generates a human-readable device label based on user agent and screen
 */
export function getDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Desktop Browser';
  const ua = navigator.userAgent;
  let browser = 'Browser';
  if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Safari')) browser = 'Safari';

  let os = 'Device';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Macintosh|Mac OS/i.test(ua)) os = 'Mac';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  const isPWA = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  return `${isPWA ? 'PWA on ' : ''}${browser} (${os})`;
}

/**
 * Calculates 17:00 IST cutoff timestamp for today's challenge
 */
export function getDailyCutoffTimestamp(): number {
  const now = new Date();
  const utcMs = now.getTime();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(utcMs + istOffsetMs);

  const istHours = istDate.getUTCHours();
  const targetIst = new Date(istDate);
  if (istHours >= 17) {
    targetIst.setUTCDate(targetIst.getUTCDate() + 1);
  }
  targetIst.setUTCHours(17, 0, 0, 0);
  return targetIst.getTime() - istOffsetMs;
}

export class DraftSyncService {
  /**
   * Sanitizes draft key for Firestore document ID
   */
  private static sanitizeDraftId(slug: string, isPractice = false): string {
    const clean = slug.replace(/[^a-zA-Z0-9_-]/g, '_');
    return isPractice ? `practice_${clean}` : `daily_${clean}`;
  }

  /**
   * Load local draft from localStorage
   */
  public static getLocalDraft(slug: string, isPractice = false): DraftData | null {
    try {
      const storageKey = isPractice
        ? `logicq_practice_draft_${slug}`
        : `logicq_draft_${slug}`;
      const metaKey = `${storageKey}_meta`;

      const rawCode = localStorage.getItem(storageKey);
      if (!rawCode) return null;

      const rawMeta = localStorage.getItem(metaKey);
      let meta: Partial<DraftData> = {};
      if (rawMeta) {
        try {
          meta = JSON.parse(rawMeta);
        } catch {
          // Ignore parse errors
        }
      }

      // Check daily expiry
      if (!isPractice && meta.expiresAt && Date.now() > meta.expiresAt) {
        DraftSyncService.clearLocalDraft(slug, isPractice);
        return null;
      }

      return {
        problemSlug: slug,
        code: rawCode,
        customInput: meta.customInput,
        updatedAt: meta.updatedAt || Date.now(),
        deviceLabel: meta.deviceLabel || getDeviceLabel(),
        expiresAt: meta.expiresAt,
      };
    } catch {
      return null;
    }
  }

  /**
   * Save draft to localStorage immediately as local cache
   */
  public static saveLocalDraft(draft: DraftData, isPractice = false): void {
    try {
      const storageKey = isPractice
        ? `logicq_practice_draft_${draft.problemSlug}`
        : `logicq_draft_${draft.problemSlug}`;
      const metaKey = `${storageKey}_meta`;

      localStorage.setItem(storageKey, draft.code);
      localStorage.setItem(
        metaKey,
        JSON.stringify({
          updatedAt: draft.updatedAt,
          deviceLabel: draft.deviceLabel,
          expiresAt: draft.expiresAt,
          customInput: draft.customInput,
        })
      );
    } catch {
      // Ignore quota exceeded
    }
  }

  /**
   * Remove local draft
   */
  public static clearLocalDraft(slug: string, isPractice = false): void {
    try {
      const storageKey = isPractice
        ? `logicq_practice_draft_${slug}`
        : `logicq_draft_${slug}`;
      localStorage.removeItem(storageKey);
      localStorage.removeItem(`${storageKey}_meta`);
    } catch {
      // Ignore
    }
  }

  /**
   * Fetch draft from Firestore
   */
  public static async fetchRemoteDraft(
    userId: string,
    slug: string,
    isPractice = false
  ): Promise<DraftData | null> {
    try {
      const draftId = DraftSyncService.sanitizeDraftId(slug, isPractice);

      // 1. Cross-Device Cohort PRN draft lookup
      const prn = FirestoreDataService.resolvePrn(userId);
      if (prn) {
        try {
          const cohortDraftRef = doc(db, 'cohort_progress', prn, 'drafts', draftId);
          const snap = await getDoc(cohortDraftRef).catch(() => null);
          if (snap && snap.exists()) {
            const data = snap.data();
            if (data?.code) {
              return {
                problemId: data.problemId,
                problemSlug: data.problemSlug || slug,
                code: data.code || '',
                customInput: data.customInput || '',
                updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
                deviceLabel: data.deviceLabel || 'Remote Device',
                expiresAt: data.expiresAt || null,
              };
            }
          }
        } catch {}
      }

      const effectiveUid = auth.currentUser?.uid || userId;
      if (!effectiveUid || !auth.currentUser) return null;

      const draftRef = doc(db, 'users', effectiveUid, 'drafts', draftId);
      const snap = await getDoc(draftRef);

      if (!snap.exists()) return null;
      const data = snap.data();

      // Check daily expiry
      if (!isPractice && data.expiresAt && Date.now() > data.expiresAt) {
        // Expired daily challenge draft: scrub it to never leak past questions
        await deleteDoc(draftRef).catch(() => {});
        return null;
      }

      return {
        problemId: data.problemId,
        problemSlug: data.problemSlug || slug,
        code: data.code || '',
        customInput: data.customInput || '',
        updatedAt: data.updatedAtMs || (data.updatedAt?.toMillis ? data.updatedAt.toMillis() : Date.now()),
        deviceLabel: data.deviceLabel || 'Remote Device',
        expiresAt: data.expiresAt || null,
      };
    } catch (err: any) {
      if (err?.code !== 'permission-denied') {
        console.warn('Failed to fetch remote draft:', err);
      }
      return null;
    }
  }

  /**
   * Save draft to Firestore (debounced from callers)
   */
  public static async saveRemoteDraft(
    userId: string,
    draft: DraftData,
    isPractice = false
  ): Promise<boolean> {
    try {
      if (!draft.code || draft.code.length > MAX_DRAFT_SIZE_BYTES) {
        return false;
      }

      const draftId = DraftSyncService.sanitizeDraftId(draft.problemSlug, isPractice);

      // 1. Cross-Device Cohort PRN draft persistence
      const prn = FirestoreDataService.resolvePrn(userId);
      if (prn) {
        try {
          const cohortDraftRef = doc(db, 'cohort_progress', prn, 'drafts', draftId);
          await setDoc(cohortDraftRef, {
            problemSlug: draft.problemSlug,
            code: draft.code,
            customInput: draft.customInput || '',
            deviceLabel: draft.deviceLabel || getDeviceLabel(),
            updatedAt: Date.now(),
          }, { merge: true });
        } catch {}
      }

      const effectiveUid = auth.currentUser?.uid || userId;
      if (!effectiveUid || !auth.currentUser) return true;

      const draftRef = doc(db, 'users', effectiveUid, 'drafts', draftId);
      const expiresAt = isPractice ? null : (draft.expiresAt || getDailyCutoffTimestamp());

      await setDoc(draftRef, {
        problemId: draft.problemId || null,
        problemSlug: draft.problemSlug,
        code: draft.code,
        customInput: draft.customInput || '',
        deviceLabel: draft.deviceLabel || getDeviceLabel(),
        updatedAtMs: draft.updatedAt,
        updatedAt: serverTimestamp(),
        expiresAt,
        isPractice,
      });

      return true;
    } catch (err: any) {
      if (err?.code !== 'permission-denied') {
        console.warn('Failed to save remote draft:', err);
      }
      return false;
    }
  }

  /**
   * Check for draft conflict between local cache and cloud
   * Returns ConflictInfo if remote is newer and has different code
   */
  public static detectConflict(
    localDraft: DraftData | null,
    remoteDraft: DraftData | null
  ): ConflictInfo | null {
    if (!localDraft || !remoteDraft) return null;
    if (localDraft.code.trim() === remoteDraft.code.trim()) return null;

    // Remote draft is newer by at least 2 seconds (buffer for clock skew)
    if (remoteDraft.updatedAt > localDraft.updatedAt + 2000) {
      return { localDraft, remoteDraft };
    }

    return null;
  }
}
