import { QueryClient } from '@tanstack/react-query';
import { collection, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../config/firebase.js';

export type SyncScope =
  | 'PROBLEMS'
  | 'DAILY'
  | 'SECTIONS'
  | 'TESTS'
  | 'SUBMISSIONS'
  | 'USERS'
  | 'DASHBOARD'
  | 'ALL';

export interface SyncMessage {
  type: 'LOGICQ_SYNC_SIGNAL';
  scope: SyncScope;
  sourceId: string;
  timestamp: number;
}

class RealtimeSyncManager {
  private queryClient: QueryClient | null = null;
  private channel: BroadcastChannel | null = null;
  private instanceId: string = Math.random().toString(36).slice(2, 9);
  private isListeningFirestore: boolean = false;
  private unsubscribeFirestoreSections: (() => void) | null = null;
  private unsubscribeFirestoreUsers: (() => void) | null = null;
  private unsubscribeFirestoreEnrolled: (() => void) | null = null;
  private unsubscribeFirestoreTests: (() => void) | null = null;
  private unsubscribeFirestoreProblems: (() => void) | null = null;
  private unsubscribeFirestoreSubmissions: (() => void) | null = null;
  private unsubscribeAuth: Unsubscribe | null = null;
  private listeners: Map<SyncScope, Set<() => void>> = new Map();

  /**
   * Subscribes to real-time events for a specific sync scope.
   * Returns an unsubscribe function.
   */
  public on(scope: SyncScope, callback: () => void): () => void {
    if (!this.listeners.has(scope)) {
      this.listeners.set(scope, new Set());
    }
    this.listeners.get(scope)!.add(callback);
    return () => {
      this.listeners.get(scope)?.delete(callback);
    };
  }

  /**
   * Initializes the real-time mesh for the active tab/window.
   */
  public init(qc: QueryClient): void {
    this.queryClient = qc;

    // 1. Setup BroadcastChannel for zero-latency multi-tab sync
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('logicq_realtime_mesh_v1');
        this.channel.onmessage = (event: MessageEvent<SyncMessage>) => {
          if (event.data?.type === 'LOGICQ_SYNC_SIGNAL') {
            if (event.data.sourceId !== this.instanceId) {
              this.handleIncomingSync(event.data.scope);
            }
          }
        };
      } catch (err) {
        console.warn('RealtimeSyncService BroadcastChannel fallback:', err);
      }
    }

    // 2. Storage event fallback for older contexts
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e: StorageEvent) => {
        if (e.key === 'logicq_storage_sync_pulse' && e.newValue) {
          try {
            const data: SyncMessage = JSON.parse(e.newValue);
            if (data.sourceId !== this.instanceId) {
              this.handleIncomingSync(data.scope);
            }
          } catch {}
        }
      });
    }

    // 3. Connect Firestore sections real-time listener
    this.setupFirestoreListener();
  }

  /**
   * Emits a real-time sync event across all portals, tabs, and devices.
   */
  public emit(scope: SyncScope): void {
    // 1. Immediately invalidate in current tab
    this.handleIncomingSync(scope);

    // 2. Broadcast to other tabs in 0ms via BroadcastChannel
    const message: SyncMessage = {
      type: 'LOGICQ_SYNC_SIGNAL',
      scope,
      sourceId: this.instanceId,
      timestamp: Date.now(),
    };

    try {
      this.channel?.postMessage(message);
    } catch {}

    // 3. Trigger storage event for cross-tab sync fallback
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('logicq_storage_sync_pulse', JSON.stringify(message));
      }
    } catch {}
  }

  /**
   * Invalidates React Query caches according to sync scope.
   */
  private handleIncomingSync(scope: SyncScope): void {
    // 1. Invoke all custom callback subscribers
    const callbacks = this.listeners.get(scope);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb();
        } catch (err) {
          console.warn('RealtimeSyncManager callback error:', err);
        }
      });
    }
    const allCallbacks = this.listeners.get('ALL');
    if (allCallbacks && scope !== 'ALL') {
      allCallbacks.forEach((cb) => {
        try {
          cb();
        } catch (err) {
          console.warn('RealtimeSyncManager callback error:', err);
        }
      });
    }

    if (!this.queryClient) return;

    switch (scope) {
      case 'DAILY':
        this.queryClient.invalidateQueries({ queryKey: ['daily-problem'] });
        this.queryClient.invalidateQueries({ queryKey: ['daily-challenge'] });
        this.queryClient.invalidateQueries({ queryKey: ['admin-daily-system-preview'] });
        this.queryClient.invalidateQueries({ queryKey: ['admin-daily-finalization-status'] });
        this.queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        break;

      case 'PROBLEMS':
        this.queryClient.invalidateQueries({ queryKey: ['admin-problems'] });
        this.queryClient.invalidateQueries({ queryKey: ['daily-challenge'] });
        this.queryClient.invalidateQueries({ queryKey: ['problem'] });
        this.queryClient.invalidateQueries({ queryKey: ['student-practice-modules'] });
        this.queryClient.invalidateQueries({ queryKey: ['practice-modules'] });
        this.queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        break;

      case 'SECTIONS':
        this.queryClient.invalidateQueries({ queryKey: ['faculty-sections'] });
        this.queryClient.invalidateQueries({ queryKey: ['faculty-dashboard-sections'] });
        this.queryClient.invalidateQueries({ queryKey: ['admin-sections-list'] });
        this.queryClient.invalidateQueries({ queryKey: ['section-details'] });
        this.queryClient.invalidateQueries({ queryKey: ['faculty-tests'] });
        this.queryClient.invalidateQueries({ queryKey: ['student-assigned-tests'] });
        this.queryClient.invalidateQueries({ queryKey: ['my-assigned-tests'] });
        this.queryClient.invalidateQueries({ queryKey: ['faculty-analytics-hub-data'] });
        break;

      case 'TESTS':
        this.queryClient.invalidateQueries({ queryKey: ['faculty-tests'] });
        this.queryClient.invalidateQueries({ queryKey: ['faculty-dashboard-tests'] });
        this.queryClient.invalidateQueries({ queryKey: ['student-assigned-tests'] });
        this.queryClient.invalidateQueries({ queryKey: ['my-assigned-tests'] });
        this.queryClient.invalidateQueries({ queryKey: ['exam-test-details'] });
        this.queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        break;

      case 'SUBMISSIONS':
        this.queryClient.invalidateQueries({ queryKey: ['admin-submissions'] });
        this.queryClient.invalidateQueries({ queryKey: ['faculty-dashboard-recent-submissions'] });
        this.queryClient.invalidateQueries({ queryKey: ['student-my-submissions'] });
        this.queryClient.invalidateQueries({ queryKey: ['recent-submissions'] });
        this.queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        this.queryClient.invalidateQueries({ queryKey: ['admin-practice-analytics'] });
        this.queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
        this.queryClient.invalidateQueries({ queryKey: ['faculty-analytics-hub-data'] });
        break;

      case 'USERS':
        this.queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        this.queryClient.invalidateQueries({ queryKey: ['admin-firestore-users'] });
        this.queryClient.invalidateQueries({ queryKey: ['user-profile'] });
        this.queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        this.queryClient.invalidateQueries({ queryKey: ['faculty-dashboard-global-stats'] });
        this.queryClient.invalidateQueries({ queryKey: ['faculty-analytics-hub-data'] });
        break;

      case 'DASHBOARD':
        this.queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        this.queryClient.invalidateQueries({ queryKey: ['faculty-dashboard-global-stats'] });
        this.queryClient.invalidateQueries({ queryKey: ['faculty-dashboard-recent-submissions'] });
        this.queryClient.invalidateQueries({ queryKey: ['faculty-dashboard-sections'] });
        this.queryClient.invalidateQueries({ queryKey: ['faculty-dashboard-tests'] });
        this.queryClient.invalidateQueries({ queryKey: ['student-assigned-tests'] });
        this.queryClient.invalidateQueries({ queryKey: ['student-my-submissions'] });
        break;

      case 'ALL':
        this.queryClient.invalidateQueries();
        break;
    }
  }

  /**
   * Listens to Firestore collections to synchronize across different devices in real-time.
   */
  private setupFirestoreListener(): void {
    if (this.isListeningFirestore) return;
    this.isListeningFirestore = true;

    // 1. Sections sync (public institutional sections)
    try {
      this.unsubscribeFirestoreSections = onSnapshot(
        collection(db, 'sections'),
        () => {
          this.handleIncomingSync('SECTIONS');
        },
        (err) => {
          if (err.code === 'permission-denied') {
            this.unsubscribeFirestoreSections?.();
            this.unsubscribeFirestoreSections = null;
          }
        }
      );
    } catch {
      // safe fallback
    }

    // 2. Enrolled Students sync
    try {
      this.unsubscribeFirestoreEnrolled = onSnapshot(
        collection(db, 'enrolled_students'),
        () => {
          this.handleIncomingSync('USERS');
          this.handleIncomingSync('SECTIONS');
        },
        (err) => {
          if (err.code === 'permission-denied') {
            this.unsubscribeFirestoreEnrolled?.();
            this.unsubscribeFirestoreEnrolled = null;
          }
        }
      );
    } catch {
      // safe fallback
    }

    // Attach admin-restricted collection listeners dynamically based on Firebase Auth state
    this.unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      const email = (user?.email || '').toLowerCase().trim();
      const isAdmin = [
        'admin@logicq.io',
        'hariprasathset@sanjivani.edu.in',
        'logicq1304@gmail.com',
        'ipworker1908@gmail.com',
        'ipverse1918@gmail.com',
        'logicqarena@gmail.com',
      ].includes(email);

      if (isAdmin) {
        this.setupAdminListeners();
      } else {
        this.teardownAdminListeners();
      }
    });
  }

  private setupAdminListeners(): void {
    if (this.unsubscribeFirestoreProblems && this.unsubscribeFirestoreUsers) {
      return;
    }

    // Problem bank sync (Admin only)
    if (!this.unsubscribeFirestoreProblems) {
      try {
        this.unsubscribeFirestoreProblems = onSnapshot(
          collection(db, 'problems'),
          () => {
            this.handleIncomingSync('PROBLEMS');
          },
          (err) => {
            if (err?.code === 'permission-denied') {
              this.unsubscribeFirestoreProblems?.();
              this.unsubscribeFirestoreProblems = null;
            }
          }
        );
      } catch {}
    }

    // Users sync (Admin only)
    if (!this.unsubscribeFirestoreUsers) {
      try {
        this.unsubscribeFirestoreUsers = onSnapshot(
          collection(db, 'users'),
          () => {
            this.handleIncomingSync('USERS');
          },
          (err) => {
            if (err?.code === 'permission-denied') {
              this.unsubscribeFirestoreUsers?.();
              this.unsubscribeFirestoreUsers = null;
            }
          }
        );
      } catch {}
    }
  }

  private teardownAdminListeners(): void {
    try {
      this.unsubscribeFirestoreTests?.();
      this.unsubscribeFirestoreTests = null;
      this.unsubscribeFirestoreProblems?.();
      this.unsubscribeFirestoreProblems = null;
      this.unsubscribeFirestoreUsers?.();
      this.unsubscribeFirestoreUsers = null;
    } catch {}
  }

  public cleanup(): void {
    try {
      this.unsubscribeAuth?.();
      this.unsubscribeFirestoreSections?.();
      this.unsubscribeFirestoreEnrolled?.();
      this.teardownAdminListeners();
      this.channel?.close();
    } catch {}
  }
}

export const RealtimeSyncService = new RealtimeSyncManager();
