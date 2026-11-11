/**
 * Device & Session Management Service
 * 
 * Enforces Institutional Security Policies:
 * 1. Single Active Instance: Maximum 1 concurrent/parallel login allowed.
 *    If an account logs in from another device/tab, any existing session is immediately terminated.
 * 2. Device Registration: Maximum 2 authorized devices per student PRN.
 */

import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../config/firebase.js';

export interface DeviceSessionRecord {
  prn: string;
  sessionId: string;
  deviceId: string;
  registeredDevices: string[];
  lastLoginAt: number;
}

export class DeviceSessionService {
  private static broadcastChannel: BroadcastChannel | null = (() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        return new BroadcastChannel('logicq_session_concurrency_v1');
      } catch {
        return null;
      }
    }
    return null;
  })();

  /**
   * Returns or creates a persistent device identifier stored in localStorage.
   */
  public static getDeviceId(): string {
    if (typeof window === 'undefined') return 'server_device';
    const KEY = 'logicq_device_id';
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = 'dev_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now().toString(36);
      localStorage.setItem(KEY, id);
    }
    return id;
  }

  /**
   * Generates a new unique session identifier for the current browser session.
   */
  public static createSessionId(): string {
    const id = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    if (typeof window !== 'undefined') {
      localStorage.setItem('logicq_session_id', id);
      sessionStorage.setItem('logicq_session_id', id);
    }
    return id;
  }

  /**
   * Retrieves or creates a stable session identifier for tabs on this device.
   */
  public static getOrCreateSessionId(): string {
    const existing = this.getLocalSessionId();
    if (existing) return existing;
    return this.createSessionId();
  }

  /**
   * Retrieves the current local session identifier.
   */
  public static getLocalSessionId(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('logicq_session_id') || localStorage.getItem('logicq_session_id');
  }

  /**
   * Enforces device registration and single-instance session creation.
   * - Max 2 registered devices allowed per student PRN.
   * - Authoritatively stored in Firestore cohort_progress/{prn}/moduleProgress/registeredDevices.
   * - Allows multiple tabs on the SAME physical device.
   * - Generates a new sessionId on explicit login and invalidates sessions on OTHER devices.
   */
  public static async registerDeviceSession(prn: string, forceNewSession: boolean = false): Promise<{
    success: boolean;
    sessionId?: string;
    deviceId?: string;
    message?: string;
  }> {
    const cleanPrn = (prn || '').trim().toUpperCase();
    if (!cleanPrn) {
      return { success: false, message: 'PRN is required.' };
    }

    // Admins and faculty are exempt from device limits
    if (cleanPrn === 'LOGICQARENA' || cleanPrn.includes('ADMIN') || auth.currentUser?.email === 'logicqarena@gmail.com') {
      return { success: true, sessionId: forceNewSession ? this.createSessionId() : this.getOrCreateSessionId(), deviceId: this.getDeviceId() };
    }

    const deviceId = this.getDeviceId();
    const sessionId = forceNewSession ? this.createSessionId() : this.getOrCreateSessionId();

    // 1. Authoritative Firestore check in cohort_progress/{cleanPrn}
    let registeredDevices: string[] = [];
    let cohortSnap: any = null;
    try {
      cohortSnap = await getDoc(doc(db, 'cohort_progress', cleanPrn)).catch(() => null);
      if (!cohortSnap?.exists() && cleanPrn.includes('PMIM')) {
        cohortSnap = await getDoc(doc(db, 'cohort_progress', cleanPrn.replace('PMIM', 'PMIF'))).catch(() => null);
      }
      if (!cohortSnap?.exists() && cleanPrn.includes('PMIF')) {
        cohortSnap = await getDoc(doc(db, 'cohort_progress', cleanPrn.replace('PMIF', 'PMIM'))).catch(() => null);
      }
      if (!cohortSnap?.exists()) {
        cohortSnap = await getDoc(doc(db, 'cohort_progress', cleanPrn.replace(/0/g, 'O'))).catch(() => null);
      }
      if (!cohortSnap?.exists()) {
        cohortSnap = await getDoc(doc(db, 'cohort_progress', cleanPrn.replace(/O/g, '0'))).catch(() => null);
      }
      if (cohortSnap && cohortSnap.exists()) {
        const cData = cohortSnap.data();
        if (Array.isArray(cData?.moduleProgress?.registeredDevices)) {
          registeredDevices = cData.moduleProgress.registeredDevices.filter(Boolean);
        } else if (Array.isArray(cData?.registeredDevices)) {
          registeredDevices = cData.registeredDevices.filter(Boolean);
        }
      }
    } catch (err) {
      console.warn('registerDeviceSession: cohort_progress lookup notice:', err);
    }

    // 2. Check local registered devices cache as secondary check
    const deviceStorageKey = `logicq_registered_devices_${cleanPrn}`;
    try {
      const localList: string[] = JSON.parse(localStorage.getItem(deviceStorageKey) || '[]');
      if (Array.isArray(localList)) {
        registeredDevices = Array.from(new Set([...registeredDevices, ...localList]));
      }
    } catch {}

    // 3. Enforce maximum 2 devices limit per student account
    if (!registeredDevices.includes(deviceId)) {
      if (registeredDevices.length >= 2) {
        return {
          success: false,
          message: `Too many devices bound. Your account (${cleanPrn}) is already bound to 2 authorized devices. Access from a new device is restricted.`,
        };
      }
      registeredDevices.push(deviceId);
    }

    try {
      localStorage.setItem(deviceStorageKey, JSON.stringify(registeredDevices));
    } catch {}

    // Authoritatively persist bound devices to Firestore cohort_progress (always sync)
    try {
      const existingMod = cohortSnap?.data()?.moduleProgress || {};
      const nowIso = new Date().toISOString();
      const payload = {
        prn: cleanPrn,
        registeredDevices,
        moduleProgress: {
          ...existingMod,
          registeredDevices,
        },
        updatedAt: nowIso,
      };

      const targetPrns = Array.from(new Set([
        cleanPrn,
        cleanPrn.replace('PMIM', 'PMIF'),
        cleanPrn.replace('PMIF', 'PMIM'),
      ])).filter(Boolean);

      await Promise.all(
        targetPrns.map((p) =>
          setDoc(doc(db, 'cohort_progress', p), { ...payload, prn: p }, { merge: true }).catch(() => {})
        )
      );
    } catch (err) {
      console.warn('registerDeviceSession: Firestore save error:', err);
    }

    // 4. Update Firestore user drafts if signed in with Firebase Auth
    const currentUid = auth.currentUser?.uid;
    if (currentUid) {
      try {
        const sessionDocRef = doc(db, 'users', currentUid, 'drafts', 'device_session');
        await setDoc(
          sessionDocRef,
          {
            prn: cleanPrn,
            currentSessionId: sessionId,
            activeDeviceId: deviceId,
            registeredDevices,
            lastActiveAt: serverTimestamp(),
            lastActiveEpochMs: Date.now(),
            isOnline: true,
          },
          { merge: true }
        ).catch(() => {});
      } catch {}
    }

    // 5. Broadcast to any other open tabs/windows to terminate older sessions across separate devices/incognito
    if (this.broadcastChannel && forceNewSession) {
      try {
        this.broadcastChannel.postMessage({
          type: 'LOGICQ_SESSION_INVALIDATED',
          prn: cleanPrn,
          newSessionId: sessionId,
          deviceId,
          timestamp: Date.now(),
        });
      } catch {}
    }

    return {
      success: true,
      sessionId,
      deviceId,
    };
  }

  /**
   * Admin utility to reset a student's bound devices back to 0.
   */
  public static async resetDeviceBindings(prn: string): Promise<boolean> {
    const cleanPrn = (prn || '').trim().toUpperCase();
    if (!cleanPrn) return false;
    try {
      localStorage.removeItem(`logicq_registered_devices_${cleanPrn}`);
      const cohortDoc = await getDoc(doc(db, 'cohort_progress', cleanPrn)).catch(() => null);
      const existingMod = cohortDoc?.data()?.moduleProgress || {};
      await setDoc(
        doc(db, 'cohort_progress', cleanPrn),
        {
          moduleProgress: {
            ...existingMod,
            registeredDevices: [],
          },
          updatedAt: Date.now(),
        },
        { merge: true }
      ).catch(() => {});
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Fetches the bound hardware device IDs for a student PRN across aliases and storage.
   */
  public static async getRegisteredDevices(prn: string): Promise<string[]> {
    const cleanPrn = (prn || '').trim().toUpperCase();
    if (!cleanPrn) return [];
    try {
      const targetPrns = Array.from(new Set([
        cleanPrn,
        cleanPrn.replace('PMIM', 'PMIF'),
        cleanPrn.replace('PMIF', 'PMIM'),
        cleanPrn.replace(/0/g, 'O'),
        cleanPrn.replace(/O/g, '0'),
      ]));

      for (const p of targetPrns) {
        const cohortDoc = await getDoc(doc(db, 'cohort_progress', p)).catch(() => null);
        if (cohortDoc && cohortDoc.exists()) {
          const data = cohortDoc.data();
          const devs = data?.registeredDevices || data?.moduleProgress?.registeredDevices;
          if (Array.isArray(devs) && devs.length > 0) return devs.filter(Boolean);
        }
      }

      const raw = localStorage.getItem(`logicq_registered_devices_${cleanPrn}`);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length > 0) return arr.filter(Boolean);
      }
    } catch {}
    return [];
  }

  /**
   * Returns how many devices are currently bound to this PRN (0, 1, or 2).
   */
  public static async getRegisteredDevicesCount(prn: string): Promise<number> {
    const devs = await this.getRegisteredDevices(prn);
    return devs.length;
  }

  /**
   * Listens for concurrent session invalidations across tabs and devices.
   * Calls onTerminate when another instance logs in.
   */
  public static subscribeToSessionConflict(
    prn: string,
    onTerminate: (reason: string) => void
  ): () => void {
    const cleanPrn = (prn || '').trim().toUpperCase();
    const localSessionId = this.getLocalSessionId();
    if (!cleanPrn || !localSessionId) return () => {};

    // A. Cross-Tab / Cross-Window Listener via BroadcastChannel
    const handleBroadcast = (event: MessageEvent) => {
      const data = event.data;
      if (
        data &&
        data.type === 'LOGICQ_SESSION_INVALIDATED' &&
        data.prn === cleanPrn &&
        data.newSessionId !== localSessionId
      ) {
        // Multi-tab tolerance on the same authorized computer:
        // If the broadcast was dispatched from the SAME device ID, do NOT terminate.
        if (data.deviceId && data.deviceId === this.getDeviceId()) {
          return;
        }
        onTerminate('Parallel Login Detected: Another browser profile or device logged into this account. Only 1 active device session is permitted.');
      }
    };

    if (this.broadcastChannel) {
      this.broadcastChannel.addEventListener('message', handleBroadcast);
    }

    // B. Cross-Device Real-time Listener via Firestore user drafts
    let unsubscribeFirestore: (() => void) | null = null;
    const currentUid = auth.currentUser?.uid;
    if (currentUid) {
      try {
        const sessionDocRef = doc(db, 'users', currentUid, 'drafts', 'device_session');
        unsubscribeFirestore = onSnapshot(
          sessionDocRef,
          (snap) => {
            if (!snap.exists()) return;
            const data = snap.data();
            const remoteSessionId = data?.currentSessionId;
            const remoteDeviceId = data?.activeDeviceId;
            // Only terminate if the active device ID is DIFFERENT from this physical device
            if (
              remoteDeviceId &&
              remoteDeviceId !== this.getDeviceId() &&
              remoteSessionId &&
              remoteSessionId !== localSessionId
            ) {
              onTerminate('Parallel Login Detected: Another device logged into this account. Parallel logins across devices are prohibited.');
            }
          },
          (err) => {
            // Gracefully catch permission or network errors; avoid throwing unhandled exception
            if (err?.code === 'permission-denied') {
              unsubscribeFirestore?.();
              unsubscribeFirestore = null;
            }
          }
        );
      } catch {}
    }

    return () => {
      if (this.broadcastChannel) {
        this.broadcastChannel.removeEventListener('message', handleBroadcast);
      }
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }
}
