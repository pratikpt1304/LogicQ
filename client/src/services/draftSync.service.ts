import { doc, getDoc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase.js';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';
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
   * Fetch draft from cloud (Supabase student_drafts -> KeyVal cloud mesh -> Firestore)
   */
  public static async fetchRemoteDraft(
    userId: string,
    slug: string,
    isPractice = false
  ): Promise<DraftData | null> {
    try {
      const prn = FirestoreDataService.resolvePrn(userId);
      const lookupKey = (prn || userId || auth.currentUser?.uid || '').toUpperCase().trim();

      // 1. Supabase student_drafts lookup (fastest & quota-free)
      if (isSupabaseConfigured && lookupKey) {
        try {
          const draftId = `${lookupKey}_${slug}`.toLowerCase();
          const { data: sbDraft, error } = await supabase
            .from('student_drafts')
            .select('*')
            .eq('id', draftId)
            .maybeSingle();

          if (!error && sbDraft?.code) {
            return {
              problemId: sbDraft.problem_slug || slug,
              problemSlug: sbDraft.problem_slug || slug,
              code: sbDraft.code || '',
              customInput: sbDraft.custom_input || '',
              updatedAt: new Date(sbDraft.updated_at || Date.now()).getTime(),
              deviceLabel: sbDraft.device_label || 'Remote Device',
              expiresAt: null,
            };
          }
        } catch {}
      }

      // 2. High-speed KeyVal cloud mesh lookup (cross-device instant sync)
      if (lookupKey) {
        try {
          const safeKey = `lq_d_${lookupKey}_${slug}`.replace(/[^a-zA-Z0-9_]/g, '_');
          const kvRes = await fetch(`https://api.keyval.org/get/${safeKey}`, { signal: AbortSignal.timeout(2500) });
          if (kvRes.ok) {
            const kvJson = await kvRes.json();
            if (kvJson && kvJson.status === 'SUCCESS' && kvJson.val) {
              const parsed = JSON.parse(kvJson.val);
              if (parsed?.code) {
                return {
                  problemId: parsed.problemSlug || slug,
                  problemSlug: parsed.problemSlug || slug,
                  code: parsed.code || '',
                  customInput: parsed.customInput || '',
                  updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
                  deviceLabel: parsed.deviceLabel || 'Remote Device',
                  expiresAt: null,
                };
              }
            }
          }
        } catch {}
      }

      // 3. Fallback: Firestore cohort_progress drafts
      const draftId = DraftSyncService.sanitizeDraftId(slug, isPractice);
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
   * Save draft to cloud (KeyVal cloud mesh + Supabase student_drafts + Firestore)
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

      const prn = FirestoreDataService.resolvePrn(userId);
      const lookupKey = (prn || userId || auth.currentUser?.uid || '').toUpperCase().trim();

      // 1. KeyVal cloud mesh instant broadcast (cross-device sync with zero latency)
      if (lookupKey && draft.code) {
        try {
          const safeKey = `lq_d_${lookupKey}_${draft.problemSlug}`.replace(/[^a-zA-Z0-9_]/g, '_');
          const payload = {
            problemSlug: draft.problemSlug,
            code: draft.code,
            customInput: draft.customInput || '',
            deviceLabel: draft.deviceLabel || getDeviceLabel(),
            updatedAt: draft.updatedAt || Date.now(),
          };
          fetch(`https://api.keyval.org/set/${safeKey}/${encodeURIComponent(JSON.stringify(payload))}`, {
            signal: AbortSignal.timeout(3000),
          }).catch(() => {});
        } catch {}
      }

      // 2. Supabase student_drafts persistence (if table exists)
      if (isSupabaseConfigured && lookupKey && draft.code) {
        try {
          const draftId = `${lookupKey}_${draft.problemSlug}`.toLowerCase();
          Promise.resolve(
            supabase.from('student_drafts').upsert({
              id: draftId,
              student_prn: lookupKey,
              problem_slug: draft.problemSlug,
              code: draft.code,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'id' })
          ).catch(() => {});
        } catch {}
      }

      const draftId = DraftSyncService.sanitizeDraftId(draft.problemSlug, isPractice);

      // 3. Cross-Device Cohort PRN draft persistence (Firestore)
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
