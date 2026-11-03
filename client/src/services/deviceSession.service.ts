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
   * Retrieves the current local session identifier.
   */
  public static getLocalSessionId(): string | null {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem('logicq_session_id') || localStorage.getItem('logicq_session_id');
  }

  /**
   * Enforces device registration and single-instance session creation.
   * - Max 2 registered devices allowed per student PRN.
   * - Generates a new sessionId and invalidates any previous session.
   */
  public static async registerDeviceSession(prn: string): Promise<{
    success: boolean;
    sessionId?: string;
    deviceId?: string;
    message?: string;
  }> {
    const cleanPrn = (prn || '').trim().toUpperCase();
    if (!cleanPrn) {
      return { success: false, message: 'PRN is required.' };
    }

    const deviceId = this.getDeviceId();
    const sessionId = this.createSessionId();

    // 1. Check local registered devices cache
    const deviceStorageKey = `logicq_registered_devices_${cleanPrn}`;
    let registeredDevices: string[] = [];
    try {
      registeredDevices = JSON.parse(localStorage.getItem(deviceStorageKey) || '[]');
    } catch {}

    // 2. Try Firestore lookup for authoritative cross-device registration check
    const currentUid = auth.currentUser?.uid;
    if (currentUid) {
      try {
        const sessionDocRef = doc(db, 'users', currentUid, 'drafts', 'device_session');
        const snap = await getDoc(sessionDocRef).catch(() => null);
        if (snap && snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data.registeredDevices) && data.registeredDevices.length > 0) {
            registeredDevices = Array.from(new Set([...registeredDevices, ...data.registeredDevices]));
          }
        }
      } catch {
        // Offline / fallback to local storage
      }
    }

    // 3. Enforce maximum 2 devices limit per account
    const isDeviceKnown = registeredDevices.includes(deviceId);
    if (!isDeviceKnown) {
      if (registeredDevices.length >= 2) {
        return {
          success: false,
          message: `Device Limit Reached: Your PRN (${cleanPrn}) is already registered on 2 devices. Parallel or multi-device abuse is restricted. Please contact your instructor to reset device authorization.`,
        };
      }
      registeredDevices.push(deviceId);
      try {
        localStorage.setItem(deviceStorageKey, JSON.stringify(registeredDevices));
      } catch {}
    }

    // 4. Update Firestore with new active session (overwrites any previous session)
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
      } catch {
        // Non-blocking for offline demo
      }
    }

    // 5. Broadcast to any other open tabs/windows to immediately terminate older sessions
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'LOGICQ_SESSION_INVALIDATED',
          prn: cleanPrn,
          newSessionId: sessionId,
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
        onTerminate('Parallel Login Detected: Another tab or browser logged into this account. Only 1 active instance is allowed.');
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
            if (remoteSessionId && remoteSessionId !== localSessionId) {
              onTerminate('Parallel Login Detected: Another device logged into this account. Parallel logins are prohibited.');
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
