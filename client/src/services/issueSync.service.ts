import { realtimeSync } from './realtimeSync.service.js';
import { db } from '../config/firebase.js';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';

export const ISSUES_NTFY_URL = 'https://ntfy.sh/logicq-raised-issues-stream-v2';

export interface SyncedIssue {
  id: string;
  questionId: string;
  questionTitle: string;
  contextType: 'PRACTICE' | 'LAB_INTERNAL' | 'EXAM';
  category: string;
  description: string;
  studentId: string;
  studentName: string;
  studentPrn: string;
  studentEmail: string;
  studentPhone?: string;
  studentWhatsapp?: string;
  createdAt: string;
  status: 'OPEN' | 'RESOLVED' | 'IN_PROGRESS';
  assignedTo?: string;
  assignedEmail?: string;
  assignedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionComment?: string;
}

export class IssueSyncService {
  private static sseConnection: EventSource | null = null;
  private static listeners: Set<(issue: SyncedIssue) => void> = new Set();

  /**
   * Broadcast a newly raised issue to NTFY cloud stream + Supabase + Firestore
   */
  public static async broadcastNewIssue(issue: SyncedIssue): Promise<void> {
    // 1. Save in localStorage for immediate local response
    try {
      const storedKey = 'logicq_faculty_raised_issues';
      const existing = JSON.parse(localStorage.getItem(storedKey) || '[]');
      const filtered = existing.filter((i: any) => i.id !== issue.id);
      filtered.unshift({ ...issue, syncedToCloud: true });
      localStorage.setItem(storedKey, JSON.stringify(filtered.slice(0, 100)));
    } catch {}

    // 2. Publish to Supabase (primary persistent store with zero rate limits)
    if (isSupabaseConfigured) {
      try {
        await supabase.from('raised_issues').upsert({
          id: issue.id,
          question_id: issue.questionId,
          question_title: issue.questionTitle,
          context_type: issue.contextType,
          category: issue.category,
          description: issue.description,
          student_id: issue.studentId,
          student_name: issue.studentName,
          student_prn: issue.studentPrn,
          student_email: issue.studentEmail,
          student_phone: issue.studentPhone,
          student_whatsapp: issue.studentWhatsapp,
          status: issue.status || 'OPEN',
          created_at: issue.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } catch (sbErr) {
        console.warn('IssueSyncService Supabase write notice:', sbErr);
      }
    }

    // 3. Publish to NTFY issues stream (cross-device fallback)
    try {
      await fetch(ISSUES_NTFY_URL, {
        method: 'POST',
        headers: {
          Title: `LogicQ Student Issue: ${issue.studentPrn} - ${issue.questionTitle}`,
          Priority: 'high',
          Tags: 'ticket,warning',
        },
        body: JSON.stringify({
          type: 'NEW_STUDENT_ISSUE',
          issue,
          timestamp: Date.now(),
        }),
      });
    } catch (err) {
      console.warn('IssueSyncService NTFY broadcast notice:', err);
    }

    // 4. Background Firestore write (gracefully catch quota exhaustion)
    try {
      addDoc(collection(db, 'raised_issues'), {
        ...issue,
        serverTimestamp: serverTimestamp(),
      }).catch((e) => {
        console.warn('IssueSyncService Firestore write caught:', e?.message);
      });
    } catch {}

    realtimeSync.emit('ISSUES');
  }

  /**
   * Broadcast an update to an existing issue (claim, resolve, reopen, phone edit)
   */
  public static async broadcastStatusUpdate(update: {
    id: string;
    studentPrn?: string;
    description?: string;
    status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
    assignedTo?: string;
    assignedEmail?: string;
    assignedAt?: string;
    resolvedBy?: string;
    resolvedAt?: string;
    studentPhone?: string;
    studentWhatsapp?: string;
  }): Promise<void> {
    let existing: any[] = [];
    // 1. Update in local cache
    try {
      const storedKey = 'logicq_faculty_raised_issues';
      existing = JSON.parse(localStorage.getItem(storedKey) || '[]');
      const updated = existing.map((i: any) =>
        i.id === update.id || (update.studentPrn && i.studentPrn === update.studentPrn && i.description === update.description)
          ? { ...i, ...update }
          : i
      );
      localStorage.setItem(storedKey, JSON.stringify(updated));
    } catch {}

    // 2. Update in Supabase
    if (isSupabaseConfigured && update.id) {
      try {
        const updatePayload: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };
        if (update.status) updatePayload.status = update.status;
        if (update.assignedTo !== undefined) updatePayload.assigned_to = update.assignedTo;
        if (update.assignedEmail !== undefined) updatePayload.assigned_email = update.assignedEmail;
        if (update.assignedAt !== undefined) updatePayload.assigned_at = update.assignedAt;
        if (update.resolvedBy !== undefined) updatePayload.resolved_by = update.resolvedBy;
        if (update.resolvedAt !== undefined) updatePayload.resolved_at = update.resolvedAt;
        if (update.studentPhone !== undefined) updatePayload.student_phone = update.studentPhone;
        if (update.studentWhatsapp !== undefined) updatePayload.student_whatsapp = update.studentWhatsapp;

        const { data: updatedRows } = await supabase.from('raised_issues').update(updatePayload).eq('id', update.id).select();
        if (!updatedRows || updatedRows.length === 0) {
          let byDescRows: any = null;
          if (update.studentPrn && update.description) {
            const { data } = await supabase.from('raised_issues').update(updatePayload)
              .ilike('student_prn', update.studentPrn.trim())
              .ilike('description', update.description.trim())
              .select();
            byDescRows = data;
          }
          if (!byDescRows || byDescRows.length === 0) {
            const fullIssue = existing.find((i: any) => i.id === update.id || (update.studentPrn && i.studentPrn === update.studentPrn));
            if (fullIssue) {
              await supabase.from('raised_issues').upsert({
                id: update.id,
                question_id: fullIssue.questionId || 'general',
                question_title: fullIssue.questionTitle || 'Reported Problem',
                context_type: fullIssue.contextType || 'PRACTICE',
                category: fullIssue.category || 'OTHER',
                description: fullIssue.description || update.description || '',
                student_id: fullIssue.studentId || '',
                student_name: fullIssue.studentName || 'Student',
                student_prn: update.studentPrn || fullIssue.studentPrn || '',
                student_email: fullIssue.studentEmail || '',
                student_phone: fullIssue.studentPhone || '',
                student_whatsapp: fullIssue.studentWhatsapp || '',
                status: update.status || 'RESOLVED',
                resolved_by: update.resolvedBy,
                resolved_at: update.resolvedAt,
                created_at: fullIssue.createdAt || new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
            }
          }
        }
      } catch (sbErr) {
        console.warn('IssueSyncService Supabase update notice:', sbErr);
      }
    }

    // 3. Publish update event to NTFY
    try {
      await fetch(ISSUES_NTFY_URL, {
        method: 'POST',
        headers: {
          Title: `LogicQ Issue Updated: ${update.id} -> ${update.status || 'UPDATED'}`,
          Priority: 'default',
        },
        body: JSON.stringify({
          type: 'UPDATE_ISSUE_STATUS',
          update,
          timestamp: Date.now(),
        }),
      });
    } catch (err) {
      console.warn('IssueSyncService NTFY update notice:', err);
    }

    // 4. Background Firestore updateDoc
    try {
      if (update.id && !update.id.startsWith('local-') && !update.id.startsWith('iss_')) {
        updateDoc(doc(db, 'raised_issues', update.id), {
          ...update,
        }).catch(() => {});
      }
    } catch {}

    realtimeSync.emit('ISSUES');
  }

  /**
   * Broadcast an issue deletion across local storage, Supabase, Firestore & NTFY stream
   */
  public static async broadcastDeleteIssue(
    issueId: string,
    studentPrn?: string,
    description?: string
  ): Promise<void> {
    const cleanPrn = (studentPrn || '').trim().toUpperCase();
    const cleanDesc = (description || '').trim();
    const tombstoneKey = cleanPrn && cleanDesc ? `${cleanPrn}:::${cleanDesc}` : issueId;

    // 1. Add to local tombstones list so it's NEVER restored
    try {
      const tombstones = JSON.parse(localStorage.getItem('logicq_deleted_issues_tombstones') || '[]');
      if (!tombstones.includes(tombstoneKey)) {
        tombstones.push(tombstoneKey);
      }
      if (issueId && !tombstones.includes(issueId)) {
        tombstones.push(issueId);
      }
      localStorage.setItem('logicq_deleted_issues_tombstones', JSON.stringify(tombstones.slice(-200)));

      // Remove from cached issues list
      const storedKey = 'logicq_faculty_raised_issues';
      const existing = JSON.parse(localStorage.getItem(storedKey) || '[]');
      const filtered = existing.filter((i: any) => {
        if (i.id === issueId) return false;
        if (cleanPrn && cleanDesc && i.studentPrn?.toUpperCase() === cleanPrn && i.description?.trim() === cleanDesc) {
          return false;
        }
        return true;
      });
      localStorage.setItem(storedKey, JSON.stringify(filtered));
    } catch {}

    // 2. Delete from Supabase
    if (isSupabaseConfigured) {
      try {
        if (issueId) {
          await supabase.from('raised_issues').delete().eq('id', issueId);
        }
        if (cleanPrn && cleanDesc) {
          await supabase.from('raised_issues').delete().match({ student_prn: cleanPrn, description: cleanDesc });
        }
      } catch (sbErr) {
        console.warn('IssueSyncService Supabase delete notice:', sbErr);
      }
    }

    // 3. Broadcast DELETE event to NTFY cloud stream
    try {
      await fetch(ISSUES_NTFY_URL, {
        method: 'POST',
        headers: {
          Title: `LogicQ Issue Deleted: ${issueId}`,
          Priority: 'low',
        },
        body: JSON.stringify({
          type: 'DELETE_ISSUE',
          issueId,
          studentPrn: cleanPrn,
          description: cleanDesc,
          timestamp: Date.now(),
        }),
      });
    } catch (err) {
      console.warn('IssueSyncService NTFY delete notice:', err);
    }

    // 4. Delete from Firestore in background
    try {
      if (issueId && !issueId.startsWith('local-')) {
        deleteDoc(doc(db, 'raised_issues', issueId)).catch(() => {});
      }
    } catch {}

    realtimeSync.emit('ISSUES');
  }

  /**
   * Fetch all issues stored in Supabase
   */
  public static async fetchSupabaseIssues(): Promise<SyncedIssue[]> {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from('raised_issues')
        .select('*')
        .order('created_at', { ascending: false });
      if (error || !data) return [];

      const tombstones = new Set<string>();
      try {
        const stored = JSON.parse(localStorage.getItem('logicq_deleted_issues_tombstones') || '[]');
        if (Array.isArray(stored)) stored.forEach((t: string) => tombstones.add(String(t)));
      } catch {}

      return data
        .map((d: any) => ({
          id: d.id,
          questionId: d.question_id || '',
          questionTitle: d.question_title || '',
          contextType: d.context_type || 'PRACTICE',
          category: d.category || 'OTHER',
          description: d.description || '',
          studentId: d.student_id || '',
          studentName: d.student_name || '',
          studentPrn: d.student_prn || '',
          studentEmail: d.student_email || '',
          studentPhone: d.student_phone || '',
          studentWhatsapp: d.student_whatsapp || '',
          createdAt: d.created_at || new Date().toISOString(),
          status: d.status || 'OPEN',
          assignedTo: d.assigned_to,
          assignedEmail: d.assigned_email,
          assignedAt: d.assigned_at,
          resolvedBy: d.resolved_by,
          resolvedAt: d.resolved_at,
        }))
        .filter((i) => {
          const prn = (i.studentPrn || '').toUpperCase().trim();
          const desc = (i.description || '').trim();
          const key = `${prn}:::${desc}`;
          return !tombstones.has(i.id) && !tombstones.has(key);
        });
    } catch {
      return [];
    }
  }

  /**
   * Fetch all issues stored in the NTFY issues cloud stream
   */
  public static async fetchMeshIssues(): Promise<SyncedIssue[]> {
    const issuesMap = new Map<string, SyncedIssue>();
    const deletedTombstones = new Set<string>();

    try {
      const localTombstones = JSON.parse(localStorage.getItem('logicq_deleted_issues_tombstones') || '[]');
      if (Array.isArray(localTombstones)) {
        localTombstones.forEach((t: string) => deletedTombstones.add(String(t)));
      }
    } catch {}

    try {
      const res = await fetch(`${ISSUES_NTFY_URL}/json?poll=1`, {
        signal: AbortSignal.timeout(4500),
      });
      if (res.ok) {
        const text = await res.text();
        const lines = text.split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.event === 'message' && data.message) {
              const payload = typeof data.message === 'string' ? JSON.parse(data.message) : data.message;
              if (payload?.type === 'DELETE_ISSUE') {
                if (payload.issueId) {
                  issuesMap.delete(payload.issueId);
                  deletedTombstones.add(payload.issueId);
                }
                if (payload.studentPrn && payload.description) {
                  const key = `${payload.studentPrn.toUpperCase()}:::${payload.description.trim()}`;
                  deletedTombstones.add(key);
                  for (const [k, v] of issuesMap.entries()) {
                    if (v.studentPrn?.toUpperCase() === payload.studentPrn.toUpperCase() && v.description?.trim() === payload.description.trim()) {
                      issuesMap.delete(k);
                    }
                  }
                }
              } else if (payload?.type === 'NEW_STUDENT_ISSUE' && payload.issue?.id) {
                const prn = (payload.issue.studentPrn || '').toUpperCase().trim();
                const desc = (payload.issue.description || '').trim();
                const key = `${prn}:::${desc}`;
                if (!deletedTombstones.has(payload.issue.id) && !deletedTombstones.has(key)) {
                  issuesMap.set(payload.issue.id, payload.issue);
                }
              } else if (payload?.type === 'UPDATE_ISSUE_STATUS' && payload.update?.id) {
                const existing = issuesMap.get(payload.update.id);
                if (existing) {
                  issuesMap.set(payload.update.id, { ...existing, ...payload.update });
                } else {
                  // Check matching by PRN and description
                  for (const [k, v] of issuesMap.entries()) {
                    if (payload.update.studentPrn && v.studentPrn === payload.update.studentPrn) {
                      issuesMap.set(k, { ...v, ...payload.update });
                    }
                  }
                }
              }
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err?.name !== 'TimeoutError' && !err?.message?.includes('timed out')) {
        console.warn('IssueSyncService fetchMeshIssues notice:', err);
      }
    }

    // Filter out any tombstoned items
    return Array.from(issuesMap.values()).filter((item) => {
      const prn = (item.studentPrn || '').toUpperCase().trim();
      const desc = (item.description || '').trim();
      const key = `${prn}:::${desc}`;
      return !deletedTombstones.has(item.id) && !deletedTombstones.has(key);
    });
  }

  /**
   * Subscribe to live SSE events from the NTFY issues topic
   */
  public static subscribeToLiveMesh(onIssueOrUpdate: (issue: SyncedIssue) => void): () => void {
    if (typeof window === 'undefined' || !('EventSource' in window)) {
      return () => {};
    }

    this.listeners.add(onIssueOrUpdate);

    if (!this.sseConnection) {
      try {
        this.sseConnection = new EventSource(`${ISSUES_NTFY_URL}/sse`);
        this.sseConnection.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.event === 'message' && data.message) {
              const payload = typeof data.message === 'string' ? JSON.parse(data.message) : data.message;
              if (payload?.type === 'DELETE_ISSUE') {
                try {
                  const tombstones = JSON.parse(localStorage.getItem('logicq_deleted_issues_tombstones') || '[]');
                  if (payload.issueId && !tombstones.includes(payload.issueId)) {
                    tombstones.push(payload.issueId);
                  }
                  if (payload.studentPrn && payload.description) {
                    const key = `${payload.studentPrn.toUpperCase()}:::${payload.description.trim()}`;
                    if (!tombstones.includes(key)) tombstones.push(key);
                  }
                  localStorage.setItem('logicq_deleted_issues_tombstones', JSON.stringify(tombstones.slice(-200)));

                  const storedKey = 'logicq_faculty_raised_issues';
                  const existing = JSON.parse(localStorage.getItem(storedKey) || '[]');
                  const filtered = existing.filter((i: any) => {
                    if (payload.issueId && i.id === payload.issueId) return false;
                    if (
                      payload.studentPrn &&
                      payload.description &&
                      i.studentPrn?.toUpperCase() === payload.studentPrn.toUpperCase() &&
                      i.description?.trim() === payload.description.trim()
                    ) {
                      return false;
                    }
                    return true;
                  });
                  localStorage.setItem(storedKey, JSON.stringify(filtered));
                } catch {}
                realtimeSync.emit('ISSUES');
              } else if (payload?.type === 'NEW_STUDENT_ISSUE' && payload.issue) {
                this.listeners.forEach((fn) => fn(payload.issue));
                realtimeSync.emit('ISSUES');
              } else if (payload?.type === 'UPDATE_ISSUE_STATUS') {
                if (payload.update) {
                  try {
                    const storedKey = 'logicq_faculty_raised_issues';
                    const existing = JSON.parse(localStorage.getItem(storedKey) || '[]');
                    const updated = existing.map((i: any) =>
                      i.id === payload.update.id ||
                      (payload.update.studentPrn && i.studentPrn === payload.update.studentPrn && i.description === payload.update.description)
                        ? { ...i, ...payload.update }
                        : i
                    );
                    localStorage.setItem(storedKey, JSON.stringify(updated));
                  } catch {}
                }
                realtimeSync.emit('ISSUES');
              }
            }
          } catch {}
        };
        this.sseConnection.onerror = () => {
          // SSE auto-reconnects
        };
      } catch (e) {
        console.warn('IssueSyncService SSE init error:', e);
      }
    }

    return () => {
      this.listeners.delete(onIssueOrUpdate);
    };
  }

  /**
   * Universal Real-Time Listener for a Student's Reported Issues
   * Synchronizes cross-device via Supabase Realtime + LocalStorage + NTFY Mesh with zero Firestore quota reliance.
   */
  public static listenToStudentIssues(
    studentPrn: string,
    studentEmail: string,
    studentId: string,
    callback: (issues: SyncedIssue[]) => void
  ): () => void {
    const cleanPrn = (studentPrn || '').toUpperCase().trim();
    const cleanEmail = (studentEmail || '').toLowerCase().trim();
    const cleanId = (studentId || '').trim();

    if (!cleanPrn && !cleanEmail && !cleanId) {
      callback([]);
      return () => {};
    }

    const matchesStudent = (i: any): boolean => {
      const pPrn = String(i.studentPrn || i.student_prn || '').toUpperCase().trim();
      const pEmail = String(i.studentEmail || i.student_email || '').toLowerCase().trim();
      const pId = String(i.studentId || i.student_id || '').trim();
      return Boolean(
        (cleanPrn && pPrn && (pPrn === cleanPrn || cleanPrn.includes(pPrn) || pPrn.includes(cleanPrn))) ||
        (cleanEmail && pEmail && pEmail === cleanEmail) ||
        (cleanId && pId && pId === cleanId)
      );
    };

    const mergedMap = new Map<string, SyncedIssue>();

    const getSig = (i: any): string => {
      const title = String(i.questionTitle || i.question_title || '').trim().toLowerCase();
      const desc = String(i.description || '').trim().toLowerCase();
      return `${title}:::${desc}` || String(i.id || '');
    };

    const emit = () => {
      const list = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      callback(list);
    };

    const mergeIssues = (items: SyncedIssue[]) => {
      let changed = false;
      items.forEach((item) => {
        if (!matchesStudent(item)) return;
        const sig = getSig(item);
        const existing = mergedMap.get(sig);
        if (!existing) {
          mergedMap.set(sig, item);
          changed = true;
        } else {
          // Rule: Status RESOLVED takes highest priority
          const isResolved = item.status === 'RESOLVED';
          const wasResolved = existing.status === 'RESOLVED';
          if (isResolved && !wasResolved) {
            mergedMap.set(sig, { ...existing, ...item, status: 'RESOLVED' });
            changed = true;
          } else if (!wasResolved && item.status !== existing.status) {
            mergedMap.set(sig, { ...existing, ...item });
            changed = true;
          } else if (item.resolvedBy && !existing.resolvedBy) {
            mergedMap.set(sig, { ...existing, ...item });
            changed = true;
          }
        }
      });
      if (changed) emit();
    };

    // 1. Initial Local Cache
    try {
      const local = JSON.parse(localStorage.getItem('logicq_faculty_raised_issues') || '[]');
      if (Array.isArray(local)) {
        mergeIssues(local);
      }
    } catch {}

    // 2. Fetch from Supabase (immune to Firestore quota limits)
    const fetchFromSupabase = async () => {
      if (!isSupabaseConfigured) return;
      try {
        const { data, error } = await supabase
          .from('raised_issues')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const mapped: SyncedIssue[] = data.map((d: any) => ({
            id: d.id,
            questionId: d.question_id || '',
            questionTitle: d.question_title || '',
            contextType: d.context_type || 'PRACTICE',
            category: d.category || 'OTHER',
            description: d.description || '',
            studentId: d.student_id || '',
            studentName: d.student_name || '',
            studentPrn: d.student_prn || '',
            studentEmail: d.student_email || '',
            studentPhone: d.student_phone || '',
            studentWhatsapp: d.student_whatsapp || '',
            createdAt: d.created_at || new Date().toISOString(),
            status: d.status || 'OPEN',
            assignedTo: d.assigned_to,
            assignedEmail: d.assigned_email,
            assignedAt: d.assigned_at,
            resolvedBy: d.resolved_by,
            resolvedAt: d.resolved_at,
          }));

          mergeIssues(mapped);

          // Update local cache with latest status
          try {
            const storedKey = 'logicq_faculty_raised_issues';
            const local = JSON.parse(localStorage.getItem(storedKey) || '[]');
            const localMap = new Map(local.map((i: any) => [getSig(i), i]));
            mapped.forEach((m) => {
              const sig = getSig(m);
              localMap.set(sig, { ...(localMap.get(sig) || {}), ...m });
            });
            localStorage.setItem(storedKey, JSON.stringify(Array.from(localMap.values()).slice(0, 100)));
          } catch {}
        }
      } catch (err) {
        console.warn('listenToStudentIssues Supabase fetch notice:', err);
      }
    };

    fetchFromSupabase();

    // 3. Supabase Realtime Subscription (0ms instant cloud push)
    let sbChannel: any = null;
    if (isSupabaseConfigured) {
      try {
        sbChannel = supabase
          .channel(`student_issues_${cleanPrn || Math.random().toString(36).substring(2, 6)}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'raised_issues' },
            () => {
              fetchFromSupabase();
            }
          )
          .subscribe();
      } catch {}
    }

    // 4. NTFY SSE Mesh Listener
    const unsubMesh = IssueSyncService.subscribeToLiveMesh(() => {
      fetchFromSupabase();
    });

    // 5. Internal RealtimeSync listener
    const unsubInternal = realtimeSync.on('ISSUES', () => {
      fetchFromSupabase();
    });

    // 6. Firestore Snapshot Listener (fallback with quota grace)
    let unsubFirestore: (() => void) | null = null;
    try {
      unsubFirestore = onSnapshot(
        collection(db, 'raised_issues'),
        (snap: any) => {
          const list: SyncedIssue[] = [];
          snap.forEach((d: any) => {
            const data = d.data();
            list.push({ id: d.id, ...data } as any);
          });
          mergeIssues(list);
        },
        (err: any) => {
          if (err?.code === 'resource-exhausted' || err?.code === 'permission-denied') {
            unsubFirestore?.();
            unsubFirestore = null;
          }
        }
      );
    } catch {}

    return () => {
      if (sbChannel) supabase.removeChannel(sbChannel);
      unsubMesh();
      unsubInternal();
      unsubFirestore?.();
    };
  }
}
