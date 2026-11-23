import { RealtimeSyncService } from './realtimeSync.service.js';
import { FirestoreDataService } from './firestoreData.service.js';
import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import { DEFAULT_HARIPRASAD_PRACTICAL_TEST, getStudentLabExamPair } from '../data/lab-assessment-questions.data.js';
import { getStudentAssessment4Pair } from '../data/assessment4-questions.data.js';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase.js';

const NTFY_URL = 'https://ntfy.sh/logicq-live-eval-stream-v2';
const KEYVAL_STATUS_SET = 'https://api.keyval.org/set/logicq_exam_status_v2026/';
const KEYVAL_STATUS_GET = 'https://api.keyval.org/get/logicq_exam_status_v2026';
const KEYVAL_CONFIRMED_SET = 'https://api.keyval.org/set/logicq_exam_confirmed_v2026/';
const KEYVAL_CONFIRMED_GET = 'https://api.keyval.org/get/logicq_exam_confirmed_v2026';
const KEYVAL_PRESENT_PRNS_SET = 'https://api.keyval.org/set/logicq_present_prns_v2026/';
const KEYVAL_PRESENT_PRNS_GET = 'https://api.keyval.org/get/logicq_present_prns_v2026';

export interface AttendanceRecordPayload {
  testId: string;
  prn: string;
  isPresent: boolean;
  studentName?: string;
  studentEmail?: string;
  timestamp: number;
}

export class AttendanceSyncService {
  private static statusListeners: Set<(testId: string, status: string) => void> = new Set();
  private static globalStatusEventSource: EventSource | null = null;

  /**
   * Listen to test status change events broadcast across the network (e.g., UPCOMING <-> ACTIVE <-> COMPLETED)
   */
  public static listenToTestStatus(callback: (testId: string, status: string) => void): () => void {
    this.statusListeners.add(callback);
    this.ensureGlobalStatusListener();
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  /**
   * Connects to ntfy.sh SSE stream to receive immediate real-time test status updates across browsers
   */
  private static ensureGlobalStatusListener(): void {
    if (this.globalStatusEventSource || typeof window === 'undefined' || !('EventSource' in window)) return;
    try {
      this.globalStatusEventSource = new EventSource(`${NTFY_URL}/sse`);
      this.globalStatusEventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.message) {
            const payload = typeof data.message === 'string' ? JSON.parse(data.message) : data.message;
            if (payload?.type === 'TEST_STATUS_CHANGED' && payload?.status) {
              const s = String(payload.status);
              const tid = payload.testId || DEFAULT_HARIPRASAD_PRACTICAL_TEST.id;
              const aliases = this.canonicalTestAliases(tid);
              aliases.forEach((a) => {
                localStorage.setItem(`logicq_test_status_${a}`, s);
              });
              localStorage.setItem('logicq_master_test_status', s);
              this.statusListeners.forEach((cb) => {
                try {
                  cb(tid, s);
                } catch {}
              });
              RealtimeSyncService.emit('TESTS');
              RealtimeSyncService.emit('DASHBOARD');
            }
          }
        } catch {}
      };
      this.globalStatusEventSource.onerror = () => {
        try {
          this.globalStatusEventSource?.close();
        } catch {}
        this.globalStatusEventSource = null;
      };
    } catch {}
  }

  /**
   * Fast network poll to fetch the latest test status broadcast even in brand new InPrivate tabs
   */
  public static async fetchLatestNetworkStatus(): Promise<string | null> {
    try {
      const res = await fetch(KEYVAL_STATUS_GET, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        const payload = await res.json();
        if (payload?.status === 'SUCCESS' && payload?.val) {
          const lastStatus = String(payload.val);
          const aliases = this.canonicalTestAliases(DEFAULT_HARIPRASAD_PRACTICAL_TEST.id);
          aliases.forEach((a) => {
            localStorage.setItem(`logicq_test_status_${a}`, lastStatus);
          });
          localStorage.setItem('logicq_master_test_status', lastStatus);
          this.statusListeners.forEach((cb) => {
            try {
              cb(DEFAULT_HARIPRASAD_PRACTICAL_TEST.id, lastStatus);
            } catch {}
          });
          return lastStatus;
        }
      }
    } catch {}

    return this.getKnownTestStatus();
  }

  /**
   * Reads the latest authoritative test status recorded in local storage
   */
  public static getKnownTestStatus(testId?: string): string | null {
    if (typeof window === 'undefined') return null;
    try {
      if (testId) {
        const val = localStorage.getItem(`logicq_test_status_${testId}`);
        if (val) return val;
      }
      const canon = localStorage.getItem('logicq_test_status_test-continuous-arrays-search-sort');
      if (canon) return canon;
      const master = localStorage.getItem('logicq_master_test_status');
      if (master) return master;
    } catch {}
    return null;
  }

  /**
   * Broadcasts test status changes (UPCOMING, ACTIVE, COMPLETED) across all browsers, devices, Firestore & ntfy.sh
   */
  public static async broadcastTestStatus(
    testId: string,
    status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED',
    title?: string
  ): Promise<void> {
    if (!testId || !status) return;
    const aliases = this.canonicalTestAliases(testId);

    // 1. Immediate local storage persistence across all aliases
    try {
      aliases.forEach((tid) => {
        localStorage.setItem(`logicq_test_status_${tid}`, status);
      });
      localStorage.setItem(`logicq_test_status_${testId}`, status);
      localStorage.setItem('logicq_master_test_status', status);
      localStorage.setItem(
        'logicq_storage_sync_pulse',
        JSON.stringify({
          type: 'LOGICQ_SYNC_SIGNAL',
          scope: 'TESTS',
          timestamp: Date.now(),
        })
      );
    } catch {}

    // 2. Local real-time emit
    RealtimeSyncService.emit('TESTS');
    RealtimeSyncService.emit('DASHBOARD');
    this.statusListeners.forEach((cb) => {
      try {
        cb(testId, status);
      } catch {}
    });

    // 3. Instant global Cloud relay via keyval.org (works across Edge, Chrome, Firefox, InPrivate)
    try {
      fetch(`${KEYVAL_STATUS_SET}${encodeURIComponent(status)}`).catch(() => null);
    } catch {}

    // 4. Update Firestore assessment_tests collection in background (best-effort, non-blocking)
    FirestoreDataService.saveAssessmentTestToFirestore({
      id: testId,
      title: title || 'Continuous Practical Evaluation: Arrays & Searching-Sorting',
      status,
      updatedAt: new Date().toISOString(),
    }).catch(() => null);
    if (testId !== 'test-continuous-arrays-search-sort') {
      FirestoreDataService.saveAssessmentTestToFirestore({
        id: 'test-continuous-arrays-search-sort',
        title: title || 'Continuous Practical Evaluation: Arrays & Searching-Sorting',
        status,
        updatedAt: new Date().toISOString(),
      }).catch(() => null);
    }
  }

  public static canonicalTestAliases(testId: string): string[] {
    const list = [
      testId,
      DEFAULT_HARIPRASAD_PRACTICAL_TEST.id,
      'test-continuous-arrays-search-sort',
      `assign-${testId}`,
      `assign-${DEFAULT_HARIPRASAD_PRACTICAL_TEST.id}`,
    ];
    return Array.from(new Set(list.filter(Boolean)));
  }

  /**
   * Verified in-lab physical attendance for student
   */
  public static isStudentPresentInLab(rawPrn: string): boolean {
    if (typeof window === 'undefined' || !rawPrn) return false;
    const cleanPrn = rawPrn.toUpperCase().trim();
    if (localStorage.getItem(`logicq_lab_attendance_any_${cleanPrn}`) === 'PRESENT') return true;
    if (localStorage.getItem(`logicq_student_present_in_lab_${cleanPrn}`) === 'true') return true;
    return false;
  }

  /**
   * Checks local storage immediately across all known aliases
   */
  public static isLocallyPresent(testId: string, rawPrn: string): boolean {
    if (typeof window === 'undefined' || !rawPrn) return false;
    const cleanPrn = rawPrn.toUpperCase().trim();

    if (localStorage.getItem(`logicq_student_present_in_lab_${cleanPrn}`) === 'true') return true;
    if (localStorage.getItem(`logicq_verified_present_${cleanPrn}`) === 'true') return true;
    if (localStorage.getItem(`logicq_lab_attendance_any_${cleanPrn}`) === 'PRESENT') return true;

    const aliases = this.canonicalTestAliases(testId);
    for (const tid of aliases) {
      const val = localStorage.getItem(`logicq_lab_attendance_${tid}_${cleanPrn}`);
      if (val === 'PRESENT') return true;
    }

    return false;
  }

  /**
   * Marks attendance for a single student and broadcasts across all networks
   */
  public static async markAttendance(
    testId: string,
    rawPrn: string,
    isPresent: boolean,
    studentName?: string,
    studentEmail?: string
  ): Promise<void> {
    if (!rawPrn) return;
    const cleanPrn = rawPrn.toUpperCase().trim();
    const aliases = this.canonicalTestAliases(testId);
    const statusVal = isPresent ? 'PRESENT' : 'ABSENT';

    // 1. Immediate local storage persistence
    try {
      aliases.forEach((tid) => {
        localStorage.setItem(`logicq_lab_attendance_${tid}_${cleanPrn}`, statusVal);
      });
      if (isPresent) {
        localStorage.setItem(`logicq_lab_attendance_any_${cleanPrn}`, 'PRESENT');
        localStorage.setItem(`logicq_student_present_in_lab_${cleanPrn}`, 'true');
        localStorage.setItem(`logicq_verified_present_${cleanPrn}`, 'true');
      } else {
        localStorage.removeItem(`logicq_lab_attendance_any_${cleanPrn}`);
        localStorage.removeItem(`logicq_student_present_in_lab_${cleanPrn}`);
        localStorage.removeItem(`logicq_verified_present_${cleanPrn}`);
      }
      localStorage.setItem('logicq_storage_sync_pulse', JSON.stringify({
        type: 'LOGICQ_SYNC_SIGNAL',
        scope: 'TESTS',
        timestamp: Date.now(),
      }));
    } catch {}

    // 2. RealtimeSync broadcast (same browser tabs)
    RealtimeSyncService.emit('TESTS');

    // 3. Ultra-fast Cloud Pub/Sub relay (connects different browsers & devices across lab)
    try {
      const payload: AttendanceRecordPayload = {
        testId: testId || DEFAULT_HARIPRASAD_PRACTICAL_TEST.id,
        prn: cleanPrn,
        isPresent: Boolean(isPresent),
        studentName: studentName || cleanPrn,
        studentEmail: studentEmail || '',
        timestamp: Date.now(),
      };
      fetch(NTFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => null);
    } catch {}

    // 4. Update KeyVal present PRNs cloud registry so student machines in lab unlock in 0-1s
    try {
      const presentSet = new Set<string>();
      if (typeof window !== 'undefined') {
        const prefix = 'logicq_lab_attendance_';
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(prefix) && localStorage.getItem(k) === 'PRESENT') {
            const parts = k.replace(prefix, '').split('_');
            const p = parts[parts.length - 1]?.toUpperCase().trim();
            if (p && p.length >= 8) presentSet.add(p);
          } else if (k && k.startsWith('logicq_student_present_in_lab_')) {
            const p = k.replace('logicq_student_present_in_lab_', '').toUpperCase().trim();
            if (p && p.length >= 8) presentSet.add(p);
          }
        }
      }
      if (isPresent) {
        presentSet.add(cleanPrn);
      } else {
        presentSet.delete(cleanPrn);
      }
      const prnsArray = Array.from(presentSet);
      const payloadVal = prnsArray.join(',') || 'NONE';
      fetch(`${KEYVAL_PRESENT_PRNS_SET}${encodeURIComponent(payloadVal)}`, { signal: AbortSignal.timeout(2500) }).catch(() => null);
      fetch(`${KEYVAL_CONFIRMED_SET}true`, { signal: AbortSignal.timeout(2500) }).catch(() => null);
    } catch {}

    // 4.5. Upsert to Supabase test_attendance
    if (isSupabaseConfigured) {
      try {
        const tid = testId || DEFAULT_HARIPRASAD_PRACTICAL_TEST.id;
        supabase.from('test_attendance').upsert({
          id: `att_${tid}_${cleanPrn}`,
          test_id: tid,
          student_prn: cleanPrn,
          student_name: studentName || cleanPrn,
          student_email: studentEmail || '',
          is_present: Boolean(isPresent),
          marked_at: new Date().toISOString(),
        }, { onConflict: 'test_id,student_prn' }).then(({ error }: any) => {
          if (error) console.warn('Supabase test_attendance notice:', error.message);
        });
      } catch {}
    }

    // 5. Firestore persistence (best-effort, ignoring quota exhaustion)
    try {
      await FirestoreDataService.recordLabAttendance(
        testId || DEFAULT_HARIPRASAD_PRACTICAL_TEST.id,
        cleanPrn,
        isPresent,
        studentName,
        studentEmail
      );
    } catch {}
  }

  /**
   * Batch marks attendance for multiple students
   */
  public static async batchMarkAttendance(
    testId: string,
    records: Array<{ prn: string; isPresent: boolean; studentName?: string; studentEmail?: string }>
  ): Promise<void> {
    if (!Array.isArray(records) || records.length === 0) return;
    const aliases = this.canonicalTestAliases(testId);

    // 1. Local storage (instantaneous)
    try {
      records.forEach((r) => {
        if (!r.prn) return;
        const cleanPrn = r.prn.toUpperCase().trim();
        const val = r.isPresent ? 'PRESENT' : 'ABSENT';
        aliases.forEach((tid) => {
          localStorage.setItem(`logicq_lab_attendance_${tid}_${cleanPrn}`, val);
        });
        if (r.isPresent) {
          localStorage.setItem(`logicq_lab_attendance_any_${cleanPrn}`, 'PRESENT');
          localStorage.setItem(`logicq_student_present_in_lab_${cleanPrn}`, 'true');
          localStorage.setItem(`logicq_verified_present_${cleanPrn}`, 'true');
        } else {
          localStorage.removeItem(`logicq_lab_attendance_any_${cleanPrn}`);
          localStorage.removeItem(`logicq_student_present_in_lab_${cleanPrn}`);
          localStorage.removeItem(`logicq_verified_present_${cleanPrn}`);
        }
      });
      localStorage.setItem('logicq_storage_sync_pulse', JSON.stringify({
        type: 'LOGICQ_SYNC_SIGNAL',
        scope: 'TESTS',
        timestamp: Date.now(),
      }));
    } catch {}

    // 2. Authoritative Supabase persistence
    if (isSupabaseConfigured && records.length > 0) {
      try {
        const tid = testId || DEFAULT_HARIPRASAD_PRACTICAL_TEST.id;
        const rows = records.map((r) => ({
          id: `att_${tid}_${r.prn.toUpperCase().trim()}`,
          test_id: tid,
          student_prn: r.prn.toUpperCase().trim(),
          student_name: r.studentName || r.prn,
          student_email: r.studentEmail || '',
          is_present: Boolean(r.isPresent),
          marked_at: new Date().toISOString(),
        }));
        supabase.from('test_attendance').upsert(rows, { onConflict: 'test_id,student_prn' }).then(({ error }: any) => {
          if (error) console.warn('Supabase batch test_attendance notice:', error.message);
        });
      } catch {}
    }

    RealtimeSyncService.emit('TESTS');

    // 3. Non-blocking Firestore batch write in background (never blocks UI)
    FirestoreDataService.batchMarkLabAttendance(testId || DEFAULT_HARIPRASAD_PRACTICAL_TEST.id, records).catch(() => null);
  }

  /**
   * Checks whether attendance has been officially confirmed & finalized by faculty
   */
  public static isAttendanceConfirmed(testId: string): boolean {
    if (typeof window === 'undefined') return false;
    if (localStorage.getItem('logicq_attendance_confirmed_master') === 'true') return true;
    const aliases = this.canonicalTestAliases(testId);
    for (const tid of aliases) {
      if (localStorage.getItem(`logicq_attendance_confirmed_${tid}`) === 'true') {
        return true;
      }
    }
    return false;
  }

  /**
   * Confirms and saves attendance for the entire lab cohort, officially unlocking verified present students
   */
  public static async confirmAndSaveAttendance(
    testId: string,
    records: Array<{ prn: string; isPresent: boolean; studentName?: string; studentEmail?: string }>
  ): Promise<void> {
    if (!testId || !Array.isArray(records)) return;
    const aliases = this.canonicalTestAliases(testId);

    // 1. Set confirmed flag in local storage for all test aliases (instant 0ms)
    try {
      aliases.forEach((tid) => {
        localStorage.setItem(`logicq_attendance_confirmed_${tid}`, 'true');
      });
      localStorage.setItem(`logicq_attendance_confirmed_${testId}`, 'true');
      localStorage.setItem('logicq_attendance_confirmed_master', 'true');
      localStorage.setItem('logicq_storage_sync_pulse', JSON.stringify({
        type: 'LOGICQ_SYNC_SIGNAL',
        scope: 'TESTS',
        timestamp: Date.now(),
      }));
    } catch {}

    // 2. Immediate local batch mark
    await this.batchMarkAttendance(testId, records);

    // 3. Fast global broadcast to unlock all browsers with exact present PRNs
    try {
      const presentPrns = records
        .filter((r) => r.isPresent && Boolean(r.prn))
        .map((r) => r.prn.toUpperCase().trim());
      const payloadVal = presentPrns.length === records.length ? 'ALL' : (presentPrns.join(',') || 'NONE');
      fetch(`${KEYVAL_PRESENT_PRNS_SET}${encodeURIComponent(payloadVal)}`, { signal: AbortSignal.timeout(2500) }).catch(() => null);
      fetch(`${KEYVAL_CONFIRMED_SET}true`, { signal: AbortSignal.timeout(2500) }).catch(() => null);
    } catch {}

    // 4. Background non-blocking persistence
    FirestoreDataService.setAssessmentAttendanceConfirmed(testId, true).catch(() => null);

    RealtimeSyncService.emit('TESTS');
  }

  /**
   * Authoritative cloud presence check.
   * If student is NOT present on the cloud (or cloud says NONE),
   * purges any stale local storage attendance flags and returns false.
   */
  public static async syncStudentAttendancePresence(rawPrn: string, targetTestId?: string): Promise<boolean> {
    if (!rawPrn) return false;
    const cleanPrn = rawPrn.toUpperCase().trim();

    const aliases = targetTestId
      ? [targetTestId, 'test-assessment-4', 'assessment-4', 'test-continuous-arrays-search-sort']
      : ['test-assessment-4', 'assessment-4', 'test-continuous-arrays-search-sort', DEFAULT_HARIPRASAD_PRACTICAL_TEST.id];

    const markLocalPresent = () => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`logicq_student_present_in_lab_${cleanPrn}`, 'true');
        localStorage.setItem(`logicq_verified_present_${cleanPrn}`, 'true');
        localStorage.setItem(`logicq_lab_attendance_any_${cleanPrn}`, 'PRESENT');
        aliases.forEach((a) => {
          localStorage.setItem(`logicq_lab_attendance_${a}_${cleanPrn}`, 'PRESENT');
        });
      }
    };

    // 1. Authoritative check in Firestore (Primary source of truth in LogicQ)
    try {
      for (const tid of aliases) {
        const attDoc = await getDoc(doc(db, 'test_attendance', `${tid}_${cleanPrn}`)).catch(() => null);
        if (attDoc && attDoc.exists()) {
          const data = attDoc.data();
          if (data?.isPresent === true || data?.status === 'PRESENT') {
            markLocalPresent();
            return true;
          }
        }
      }

      const qSnap = await getDocs(query(
        collection(db, 'test_attendance'),
        where('prn', '==', cleanPrn),
        where('isPresent', '==', true)
      )).catch(() => null);

      if (qSnap && !qSnap.empty) {
        markLocalPresent();
        return true;
      }

      for (const tid of aliases) {
        const testDoc = await getDoc(doc(db, 'assessment_tests', tid)).catch(() => null);
        if (testDoc && testDoc.exists()) {
          const tData = testDoc.data();
          if (tData?.labAttendance?.[cleanPrn] === true || tData?.labAttendanceData?.[cleanPrn]?.isPresent === true) {
            markLocalPresent();
            return true;
          }
        }
      }
    } catch (fsErr) {
      console.warn('Firestore attendance presence sync notice:', fsErr);
    }

    // 2. Authoritative check in Supabase test_attendance table
    if (isSupabaseConfigured) {
      try {
        const query = supabase
          .from('test_attendance')
          .select('is_present, test_id')
          .eq('student_prn', cleanPrn);
        if (targetTestId) {
          query.eq('test_id', targetTestId);
        }
        const { data: attRows, error } = await query;
        if (!error && Array.isArray(attRows) && attRows.some((r) => r.is_present === true)) {
          markLocalPresent();
          return true;
        }
      } catch (sbErr) {
        console.warn('Supabase attendance presence sync notice:', sbErr);
      }
    }

    try {
      const res = await fetch(KEYVAL_PRESENT_PRNS_GET, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const payload = await res.json();
        const val = payload?.status === 'SUCCESS' && payload?.val ? String(payload.val).trim() : 'NONE';
        const isPresent = val === 'ALL' || (val !== 'NONE' && val.split(',').map((p) => p.trim().toUpperCase()).includes(cleanPrn));

        if (isPresent) {
          markLocalPresent();
          return true;
        }
      }
    } catch {}

    // 4. Local presence fallback
    if (typeof window !== 'undefined') {
      if (
        localStorage.getItem(`logicq_student_present_in_lab_${cleanPrn}`) === 'true' ||
        localStorage.getItem(`logicq_verified_present_${cleanPrn}`) === 'true' ||
        localStorage.getItem(`logicq_lab_attendance_any_${cleanPrn}`) === 'PRESENT' ||
        aliases.some((tid) => localStorage.getItem(`logicq_lab_attendance_${tid}_${cleanPrn}`) === 'PRESENT')
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Fast network check to fetch the authoritative list of PRESENT student PRNs across all machines
   */
  public static async fetchLatestPresentStudents(): Promise<string[] | 'ALL' | null> {
    try {
      const res = await fetch(KEYVAL_PRESENT_PRNS_GET, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const payload = await res.json();
        if (payload?.status === 'SUCCESS' && payload?.val) {
          const val = String(payload.val).trim();
          if (val === 'ALL') {
            localStorage.setItem('logicq_all_students_present_master', 'true');
            return 'ALL';
          }
          if (val && val !== 'NONE') {
            const list = val.split(',').map((p) => p.trim().toUpperCase()).filter(Boolean);
            const aliases = ['test-continuous-arrays-search-sort', 'test-hariprasad-lab-mwnq90s6', 'test-mtech-c-practical-01'];
            list.forEach((p) => {
              localStorage.setItem(`logicq_student_present_in_lab_${p}`, 'true');
              localStorage.setItem(`logicq_lab_attendance_any_${p}`, 'PRESENT');
              localStorage.setItem(`logicq_verified_present_${p}`, 'true');
              aliases.forEach((tid) => {
                localStorage.setItem(`logicq_lab_attendance_${tid}_${p}`, 'PRESENT');
              });
            });
            return list;
          }
        }
      }
    } catch {}
    return null;
  }

  /**
   * Broadcasts a student's question submission to the real-time cloud relay
   */
  public static async broadcastStudentSubmission(sub: any): Promise<void> {
    if (!sub) return;
    const cleanPrn = (sub.studentPrn || sub.prn || '').toUpperCase().trim();
    if (!cleanPrn) return;

    const probId = String(sub.problemId || '');
    const isQ1 = probId.includes('arr') || probId.endsWith('q1') || sub.difficulty === 'EASY' || !probId.includes('ss');
    const qKey = isQ1 ? 'Q1' : 'Q2';
    const rawScore = sub.academicScore != null ? sub.academicScore : (sub.score != null ? sub.score : 0);
    const score = !isNaN(Number(rawScore)) ? Number(rawScore) : 0;
    const exits = Number(sub.fullscreenExits || 0);
    const tabs = Number(sub.tabSwitchCount || 0);
    const time = Number(sub.timeTakenSeconds || 0);
    const copyPaste = Number(sub.copyPasteAttempts || 0);
    const keystrokes = Number(sub.totalKeystrokes || 0);
    const burst = Number(sub.largestBurstChars || 0);
    const cpm = Number(sub.cpm || sub.typingVelocityCPM || 0);
    const subSnippet = `${qKey}:${score}:${exits}:${tabs}:${time}:${copyPaste}:${keystrokes}:${burst}:${cpm}`;

    // 1. Immediate local storage persistence
    try {
      const targetTid = sub.testId || sub.assignmentId || 'test';
      localStorage.setItem(`logicq_exam_student_sub_${targetTid}_${cleanPrn}_${qKey}`, subSnippet);
      localStorage.setItem(`logicq_exam_student_sub_${cleanPrn}_${qKey}`, subSnippet);
      localStorage.setItem(`logicq_exam_student_submitted_${targetTid}_${cleanPrn}`, 'true');
      localStorage.setItem(`logicq_exam_student_submitted_prn_${cleanPrn}`, 'true');
      if (sub.code) {
        localStorage.setItem(`logicq_code_sub_${targetTid}_${cleanPrn}_${qKey}`, String(sub.code));
        localStorage.setItem(`logicq_code_sub_${cleanPrn}_${qKey}`, String(sub.code));
      }
      const local = JSON.parse(localStorage.getItem('logicq_assessment_submissions') || '[]');
      const existingIdx = local.findIndex((x: any) => (x.studentPrn || x.prn) === cleanPrn && x.problemId === probId);
      if (existingIdx >= 0) local[existingIdx] = sub;
      else local.unshift(sub);
      localStorage.setItem('logicq_assessment_submissions', JSON.stringify(local.slice(0, 100)));
      localStorage.setItem('logicq_storage_sync_pulse', JSON.stringify({
        type: 'LOGICQ_SYNC_SIGNAL',
        scope: 'SUBMISSIONS',
        timestamp: Date.now(),
      }));
    } catch {}

    RealtimeSyncService.emit('SUBMISSIONS');

    // 2. Broadcast to KeyVal Cloud Mesh (Cross-Browser / Multi-PC)
    const isA4 = String(sub.testId || sub.assignmentId || '').includes('assessment-4') || String(sub.testId || sub.assignmentId || '').includes('arrays') || String(sub.problemId || '').startsWith('a4-');
    const keyPrefix = isA4 ? 'lq_sub_a4_' : 'lq_sub_lab_';
    const submittedIndexKey = isA4 ? 'lq_a4_submitted_prns' : 'lq_lab_submitted_prns';

    try {
      let combined = subSnippet;
      try {
        const existingRes = await fetch(`https://api.keyval.org/get/${keyPrefix}${cleanPrn}`, { signal: AbortSignal.timeout(1500) });
        if (existingRes.ok) {
          const payload = await existingRes.json();
          if (payload?.status === 'SUCCESS' && payload?.val) {
            const oldVal = String(payload.val);
            const parts = oldVal.split('|').filter(Boolean);
            const otherPart = parts.find((p) => !p.startsWith(qKey + ':'));
            if (otherPart) {
              combined = isQ1 ? `${subSnippet}|${otherPart}` : `${otherPart}|${subSnippet}`;
            }
          }
        }
      } catch {}

      await fetch(`https://api.keyval.org/set/${keyPrefix}${cleanPrn}/${encodeURIComponent(combined)}`, { signal: AbortSignal.timeout(2500) }).catch(() => null);

      // Also broadcast student C code to KeyVal for live faculty inspection
      if (sub.code) {
        const codeKey = isA4 ? `lq_c_a4_${cleanPrn}_${qKey}` : `lq_c_lab_${cleanPrn}_${qKey}`;
        fetch(`https://api.keyval.org/set/${codeKey}/${encodeURIComponent(String(sub.code))}`, { signal: AbortSignal.timeout(3000) }).catch(() => null);
      }

      // Mirror submission and code directly to Supabase assessment_submissions table
      if (isSupabaseConfigured) {
        try {
          const qObj = {
            problemId: probId,
            problemTitle: sub.problemTitle || (isQ1 ? 'Question 1: Arrays' : 'Question 2: Searching & Sorting'),
            code: String(sub.code || ''),
            score,
            academicScore: score,
            submittedAt: sub.submittedAt || new Date().toISOString(),
          };
          Promise.resolve(
            supabase.from('assessment_submissions').upsert({
              test_id: isA4 ? 'test-continuous-arrays-search-sort' : (sub.testId || 'test'),
              student_prn: cleanPrn,
              student_name: sub.studentName || 'Student',
              student_email: sub.studentEmail || '',
              [isQ1 ? 'q1' : 'q2']: qObj,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'test_id,student_prn' })
          ).catch(() => {});
        } catch {}
      }

      // Register student in submitted PRNs index
      try {
        const prnsRes = await fetch(`https://api.keyval.org/get/${submittedIndexKey}`, { signal: AbortSignal.timeout(1500) });
        let listStr = cleanPrn;
        if (prnsRes.ok) {
          const payload = await prnsRes.json();
          if (payload?.status === 'SUCCESS' && payload?.val) {
            const existingList = String(payload.val).split(',').map((p) => p.trim().toUpperCase()).filter(Boolean);
            if (!existingList.includes(cleanPrn)) {
              existingList.push(cleanPrn);
              listStr = existingList.join(',');
            } else {
              listStr = existingList.join(',');
            }
          }
        }
        if (listStr.length <= 110) {
          fetch(`https://api.keyval.org/set/${submittedIndexKey}/${encodeURIComponent(listStr)}`, { signal: AbortSignal.timeout(2500) }).catch(() => null);
        }
      } catch {}
    } catch {}
  }

  /**
   * Clears and resets a student's cloud submission data
   */
  public static async resetStudentSubmission(rawPrn: string): Promise<void> {
    if (!rawPrn) return;
    const cleanPrn = rawPrn.toUpperCase().trim();
    try {
      // 1. Reset on keyval
      fetch(`https://api.keyval.org/set/lq_sub26_${cleanPrn}/NONE`, { signal: AbortSignal.timeout(2500) }).catch(() => null);

      // 2. Remove from submitted PRNs index
      const prnsRes = await fetch('https://api.keyval.org/get/lq_submitted_prns_v2026', { signal: AbortSignal.timeout(1500) }).catch(() => null);
      if (prnsRes && prnsRes.ok) {
        const payload = await prnsRes.json();
        if (payload?.status === 'SUCCESS' && payload?.val) {
          const list = String(payload.val).split(',').map((p) => p.trim().toUpperCase()).filter((p) => p && p !== cleanPrn);
          const newPrns = list.join(',') || 'NONE';
          fetch(`https://api.keyval.org/set/lq_submitted_prns_v2026/${encodeURIComponent(newPrns)}`, { signal: AbortSignal.timeout(2500) }).catch(() => null);
        }
      }
    } catch {}
  }

  /**
   * Records student proctoring lock (e.g., reached 2 cheating violations) across local storage and cloud mesh
   */
  public static async recordStudentProctorLockout(
    rawPrn: string,
    details: string,
    tid?: string
  ): Promise<void> {
    if (!rawPrn) return;
    const cleanPrn = rawPrn.toUpperCase().trim();
    const testId = tid || DEFAULT_HARIPRASAD_PRACTICAL_TEST.id;

    // 1. Immediate local persistence for all aliases
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`logicq_exam_locked_${testId}_${cleanPrn}`, 'true');
        localStorage.setItem(`logicq_exam_locked_test-continuous-arrays-search-sort_${cleanPrn}`, 'true');
        localStorage.setItem(`logicq_exam_student_submitted_${testId}_${cleanPrn}`, 'true');
        localStorage.setItem(`logicq_exam_student_submitted_test-continuous-arrays-search-sort_${cleanPrn}`, 'true');
        localStorage.setItem(`logicq_exam_test_completed_${testId}`, 'true');
        localStorage.setItem('logicq_exam_test_completed_test-continuous-arrays-search-sort', 'true');
        localStorage.setItem(`logicq_exam_proctor_lock_reason_${cleanPrn}`, details);
      }
    } catch {}

    // 2. Broadcast via KeyVal cloud mesh
    try {
      const lockSnippet = details || 'CRITICAL_PROCTOR_BREACH';
      fetch(`https://api.keyval.org/set/lq_lock26_${cleanPrn}/${encodeURIComponent(lockSnippet)}`, { signal: AbortSignal.timeout(2500) }).catch(() => null);

      const prnsRes = await fetch('https://api.keyval.org/get/lq_locked_prns_v2026', { signal: AbortSignal.timeout(1500) }).catch(() => null);
      let listStr = cleanPrn;
      if (prnsRes && prnsRes.ok) {
        const payload = await prnsRes.json();
        if (payload?.status === 'SUCCESS' && payload?.val && payload.val !== 'NONE') {
          const existingList = String(payload.val).split(',').map((p) => p.trim().toUpperCase()).filter(Boolean);
          if (!existingList.includes(cleanPrn)) {
            existingList.push(cleanPrn);
          }
          listStr = existingList.join(',');
        }
      }
      fetch(`https://api.keyval.org/set/lq_locked_prns_v2026/${encodeURIComponent(listStr)}`, { signal: AbortSignal.timeout(2500) }).catch(() => null);
    } catch {}

    // 3. Broadcast to real-time pubsub
    try {
      fetch(NTFY_URL, {
        method: 'POST',
        headers: { 'Title': 'LogicQ Proctor Alert: Student Locked', 'Priority': 'high' },
        body: JSON.stringify({
          type: 'STUDENT_LOCKED_BY_PROCTOR',
          prn: cleanPrn,
          testId,
          details,
          timestamp: Date.now(),
        }),
      }).catch(() => null);
    } catch {}

    // 3.5. Update Supabase student_locks
    if (isSupabaseConfigured) {
      try {
        supabase.from('student_locks').upsert({
          student_prn: cleanPrn,
          is_locked: true,
          reason: details || 'PROCTOR_BREACH',
          locked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'student_prn' }).then(({ error }: any) => {
          if (error) console.warn('Supabase student_locks notice:', error.message);
        });
      } catch {}
    }

    // 3.6. Update Firestore proctor_locked_students
    FirestoreDataService.recordStudentProctorLockout(cleanPrn, details, testId).catch(() => {});

    RealtimeSyncService.emit('TESTS');
    RealtimeSyncService.emit('SUBMISSIONS');
  }

  /**
   * Fetches the authoritative list of locked students and their breach details from cloud mesh
   */
  public static async fetchLockedStudentsFromCloud(): Promise<Record<string, string>> {
    const map: Record<string, string> = {};

    // Fetch authoritative locked students from Firestore
    try {
      const fsLocked = await FirestoreDataService.fetchLockedStudentsFromCloud();
      Object.assign(map, fsLocked);
    } catch {}
    try {
      const res = await fetch('https://api.keyval.org/get/lq_locked_prns_v2026', { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const payload = await res.json();
        if (payload?.status === 'SUCCESS' && payload?.val && payload.val !== 'NONE') {
          const prns = String(payload.val).split(',').map((p) => p.trim().toUpperCase()).filter(Boolean);
          await Promise.all(
            prns.map(async (prn) => {
              try {
                const dRes = await fetch(`https://api.keyval.org/get/lq_lock26_${prn}`, { signal: AbortSignal.timeout(1800) });
                if (dRes.ok) {
                  const dPayload = await dRes.json();
                  if (dPayload?.status === 'SUCCESS' && dPayload?.val && dPayload.val !== 'NONE') {
                    map[prn] = decodeURIComponent(String(dPayload.val));
                  } else {
                    map[prn] = 'PROCTORING_VIOLATION_BREACH';
                  }
                }
              } catch {
                map[prn] = 'PROCTORING_VIOLATION_BREACH';
              }
            })
          );
        }
      }
    } catch {}

    // Fetch authoritative locked students from Supabase student_locks
    if (isSupabaseConfigured) {
      try {
        const { data: locks } = await supabase.from('student_locks').select('*').eq('is_locked', true);
        if (locks && Array.isArray(locks)) {
          locks.forEach((lk: any) => {
            const prn = (lk.student_prn || '').toUpperCase().trim();
            if (prn) {
              map[prn] = lk.reason || 'PROCTOR_LOCK';
            }
          });
        }
      } catch {}
    }

    return map;
  }

  /**
   * Faculty unlock of student after proctor lockout
   */
  public static async unlockStudentProctorLockout(rawPrn: string, tid?: string): Promise<void> {
    if (!rawPrn) return;
    const cleanPrn = rawPrn.toUpperCase().trim();
    const testId = tid || DEFAULT_HARIPRASAD_PRACTICAL_TEST.id;

    // 1. Clear local storage
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`logicq_exam_locked_${testId}_${cleanPrn}`);
        localStorage.removeItem(`logicq_exam_locked_test-continuous-arrays-search-sort_${cleanPrn}`);
        localStorage.removeItem(`logicq_exam_proctor_lock_reason_${cleanPrn}`);
      }
    } catch {}

    // 2. Clear KeyVal cloud lock
    try {
      fetch(`https://api.keyval.org/set/lq_lock26_${cleanPrn}/NONE`, { signal: AbortSignal.timeout(2500) }).catch(() => null);

      const prnsRes = await fetch('https://api.keyval.org/get/lq_locked_prns_v2026', { signal: AbortSignal.timeout(1500) }).catch(() => null);
      if (prnsRes && prnsRes.ok) {
        const payload = await prnsRes.json();
        if (payload?.status === 'SUCCESS' && payload?.val) {
          const list = String(payload.val).split(',').map((p) => p.trim().toUpperCase()).filter((p) => p && p !== cleanPrn);
          const newPrns = list.join(',') || 'NONE';
          fetch(`https://api.keyval.org/set/lq_locked_prns_v2026/${encodeURIComponent(newPrns)}`, { signal: AbortSignal.timeout(2500) }).catch(() => null);
        }
      }
    } catch {}

    // 3. Clear Firestore Lock
    FirestoreDataService.unlockStudentTest(testId, cleanPrn).catch(() => null);

    // 3.5. Clear Supabase student_locks
    if (isSupabaseConfigured) {
      try {
        supabase.from('student_locks').upsert({
          student_prn: cleanPrn,
          is_locked: false,
          reason: 'UNLOCKED_BY_FACULTY',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'student_prn' }).then(({ error }: any) => {
          if (error) console.warn('Supabase student_locks unlock notice:', error.message);
        });
      } catch {}
    }

    // 4. Broadcast unlock event
    try {
      fetch(NTFY_URL, {
        method: 'POST',
        headers: { 'Title': 'LogicQ Faculty Action: Student Unlocked', 'Priority': 'default' },
        body: JSON.stringify({
          type: 'STUDENT_UNLOCKED_BY_FACULTY',
          prn: cleanPrn,
          testId,
          timestamp: Date.now(),
        }),
      }).catch(() => null);
    } catch {}

    RealtimeSyncService.emit('TESTS');
    RealtimeSyncService.emit('SUBMISSIONS');
  }

  /**
   * Completely resets an individual student's test attempt:
   * Wipes code submissions, proctoring violations, locks, telemetry,
   * and broadcasts to the student machine so they can start afresh.
   */
  public static async resetIndividualStudentTest(rawPrn: string, tid?: string): Promise<void> {
    if (!rawPrn) return;
    const cleanPrn = rawPrn.toUpperCase().trim();
    const testId = tid || DEFAULT_HARIPRASAD_PRACTICAL_TEST.id;

    // 1. Cloud KeyVal resets — all in parallel for speed
    try {
      const indexKeys = ['lq_submitted_a4_prns', 'lq_submitted_prns_v2026', 'lq_locked_prns_v2026'];

      // Fetch all index lists in parallel
      const indexFetches = indexKeys.map((indexKey) =>
        fetch(`https://api.keyval.org/get/${indexKey}`, { signal: AbortSignal.timeout(1800) })
          .then(async (res) => {
            if (!res.ok) return;
            const data = await res.json();
            if (data?.status === 'SUCCESS' && data?.val && data.val !== 'NONE') {
              const list = String(data.val).split(',').map((p) => p.trim().toUpperCase()).filter((p) => p && p !== cleanPrn);
              const newVal = list.join(',') || 'NONE';
              await fetch(`https://api.keyval.org/set/${indexKey}/${encodeURIComponent(newVal)}`, { signal: AbortSignal.timeout(2000) });
            }
          })
          .catch(() => {})
      );

      await Promise.allSettled([
        fetch(`https://api.keyval.org/set/lq_is_reset_${cleanPrn}/TRUE`, { signal: AbortSignal.timeout(2500) }),
        fetch(`https://api.keyval.org/set/lq_sub26_${cleanPrn}/NONE`, { signal: AbortSignal.timeout(2500) }),
        fetch(`https://api.keyval.org/set/lq_sub_a4_${cleanPrn}/NONE`, { signal: AbortSignal.timeout(2500) }),
        fetch(`https://api.keyval.org/set/lq_sub_lab_${cleanPrn}/NONE`, { signal: AbortSignal.timeout(2500) }),
        fetch(`https://api.keyval.org/set/lq_a4_sub_${cleanPrn}_Q1/NONE`, { signal: AbortSignal.timeout(2500) }),
        fetch(`https://api.keyval.org/set/lq_a4_sub_${cleanPrn}_Q2/NONE`, { signal: AbortSignal.timeout(2500) }),
        fetch(`https://api.keyval.org/set/lq_sub_${cleanPrn}_Q1/NONE`, { signal: AbortSignal.timeout(2500) }),
        fetch(`https://api.keyval.org/set/lq_sub_${cleanPrn}_Q2/NONE`, { signal: AbortSignal.timeout(2500) }),
        fetch(`https://api.keyval.org/set/lq_lock26_${cleanPrn}/NONE`, { signal: AbortSignal.timeout(2500) }),
        fetch(`https://api.keyval.org/set/lq_proctor_lock_${cleanPrn}/NONE`, { signal: AbortSignal.timeout(2500) }),
        // Index list removals in parallel (not sequential)
        ...indexFetches,
      ]);
    } catch {}

    // 2. Supabase deletions
    if (isSupabaseConfigured) {
      try {
        await Promise.allSettled([
          supabase.from('student_locks').delete().eq('student_prn', cleanPrn),
          supabase.from('assessment_submissions').delete().eq('student_prn', cleanPrn),
        ]);
      } catch {}
    }

    // 3. Firestore deletions
    try {
      await FirestoreDataService.resetIndividualStudent(cleanPrn, testId);
    } catch {}

    // 4. Local storage purge on current browser
    if (typeof window !== 'undefined') {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (
            k.includes(cleanPrn) ||
            k.startsWith(`logicq_exam_locked_`) ||
            k.startsWith(`logicq_exam_student_submitted_`) ||
            k.startsWith(`logicq_code_sub_`) ||
            k.startsWith(`logicq_exam_draft_`)
          )) {
            if (k.includes(cleanPrn)) {
              keysToRemove.push(k);
            }
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
        localStorage.setItem(`logicq_exam_unlocked_${testId}_${cleanPrn}`, 'true');
        localStorage.setItem(`logicq_exam_unlocked_test-continuous-arrays-search-sort_${cleanPrn}`, 'true');
      } catch {}
    }

    // 4.5 Ensure student attendance is marked PRESENT so they can start test immediately
    try {
      await this.markAttendance(testId, cleanPrn, true);
    } catch {}

    // 5. Broadcast instant reset and unlock events to lab machines
    try {
      await fetch(NTFY_URL, {
        method: 'POST',
        headers: { 'Title': 'LogicQ: Student Exam Reset Fresh', 'Priority': 'high' },
        body: JSON.stringify({
          type: 'STUDENT_TEST_RESET',
          prn: cleanPrn,
          testId,
          timestamp: Date.now(),
        }),
      });
      await fetch(NTFY_URL, {
        method: 'POST',
        headers: { 'Title': 'LogicQ: Student Unlocked', 'Priority': 'high' },
        body: JSON.stringify({
          type: 'STUDENT_UNLOCKED_BY_FACULTY',
          prn: cleanPrn,
          testId,
          timestamp: Date.now(),
        }),
      });
    } catch {}

    RealtimeSyncService.emit('TESTS');
    RealtimeSyncService.emit('SUBMISSIONS');
    RealtimeSyncService.emit('ALL');
  }

  /**
   * Authoritative list of students who were reset for a fresh test attempt
   */
  public static async fetchResetStudentsFromCloud(): Promise<Set<string>> {
    const set = new Set<string>();
    try {
      const res = await fetch('https://api.keyval.org/get/lq_reset_students_v2026', { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const payload = await res.json();
        if (payload?.status === 'SUCCESS' && payload?.val && payload.val !== 'NONE') {
          String(payload.val)
            .split(',')
            .map((p) => p.trim().toUpperCase())
            .filter(Boolean)
            .forEach((p) => set.add(p));
        }
      }
    } catch {}
    return set;
  }

  /**
   * Bulk resets all students who had proctoring violations or were auto-submitted,
   * unlocking them and allowing them to take a completely fresh new test with the SAME questions.
   */
  public static async bulkResetFlaggedStudents(targetPrns: string[], tid?: string): Promise<number> {
    if (!Array.isArray(targetPrns) || targetPrns.length === 0) return 0;
    const testId = tid || DEFAULT_HARIPRASAD_PRACTICAL_TEST.id;
    const cleanList = targetPrns.map((p) => p.trim().toUpperCase()).filter(Boolean);

    // 1. Fetch existing reset list and merge
    const existing = await this.fetchResetStudentsFromCloud();
    cleanList.forEach((p) => existing.add(p));
    const mergedStr = Array.from(existing).join(',') || 'NONE';

    try {
      await fetch(`https://api.keyval.org/set/lq_reset_students_v2026/${encodeURIComponent(mergedStr)}`, {
        signal: AbortSignal.timeout(3000),
      });
    } catch {}

    // 2. Unlock & reset each student on KeyVal cloud mesh
    cleanList.forEach((prn) => {
      fetch(`https://api.keyval.org/set/lq_is_reset_${prn}/TRUE`, { signal: AbortSignal.timeout(2500) }).catch(() => null);
      fetch(`https://api.keyval.org/set/lq_sub26_${prn}/NONE`, { signal: AbortSignal.timeout(2500) }).catch(() => null);
      fetch(`https://api.keyval.org/set/lq_lock26_${prn}/NONE`, { signal: AbortSignal.timeout(2500) }).catch(() => null);
      fetch(`https://api.keyval.org/set/lq_proctor_lock_${prn}/NONE`, { signal: AbortSignal.timeout(2500) }).catch(() => null);
      fetch(`https://api.keyval.org/set/lq_pres_${prn}_${testId}/PRESENT`, { signal: AbortSignal.timeout(2500) }).catch(() => null);
    });

    // 3. Clear local storage if running in browser
    try {
      if (typeof window !== 'undefined') {
        cleanList.forEach((prn) => {
          localStorage.removeItem(`logicq_exam_locked_${testId}_${prn}`);
          localStorage.removeItem(`logicq_exam_locked_test-continuous-arrays-search-sort_${prn}`);
          localStorage.removeItem(`logicq_exam_student_submitted_${testId}_${prn}`);
          localStorage.removeItem(`logicq_exam_student_submitted_test-continuous-arrays-search-sort_${prn}`);
          localStorage.removeItem(`logicq_exam_auto_submitted_${testId}`);
          localStorage.setItem(`logicq_exam_unlocked_test-continuous-arrays-search-sort_${prn}`, 'true');
        });
      }
    } catch {}

    // 4. Broadcast instant notification to all lab machines via NTFY
    try {
      fetch(NTFY_URL, {
        method: 'POST',
        headers: { Title: 'LogicQ Faculty Action: Flagged Students Reset', Priority: 'high' },
        body: JSON.stringify({
          type: 'BULK_STUDENT_RESET_FRESH_TEST',
          prns: cleanList,
          testId,
          timestamp: Date.now(),
        }),
      }).catch(() => null);
    } catch {}

    RealtimeSyncService.emit('TESTS');
    RealtimeSyncService.emit('SUBMISSIONS');
    return cleanList.length;
  }

  /**
   * Helper to check if student is locked by proctoring violations
   */
  public static isStudentLockedByProctor(rawPrn: string, tid?: string): boolean {
    if (typeof window === 'undefined' || !rawPrn) return false;
    const cleanPrn = rawPrn.toUpperCase().trim();
    const testId = tid || DEFAULT_HARIPRASAD_PRACTICAL_TEST.id;
    return (
      localStorage.getItem(`logicq_exam_locked_${testId}_${cleanPrn}`) === 'true' ||
      localStorage.getItem(`logicq_exam_locked_test-continuous-arrays-search-sort_${cleanPrn}`) === 'true'
    );
  }

  /**
   * Checks whether a student was reset by faculty for a fresh exam
   */
  public static async isStudentReset(rawPrn: string): Promise<boolean> {
    if (!rawPrn) return false;
    const cleanPrn = rawPrn.toUpperCase().trim();
    try {
      const res = await fetch(`https://api.keyval.org/get/lq_is_reset_${cleanPrn}`, { signal: AbortSignal.timeout(1800) });
      if (res.ok) {
        const payload = await res.json();
        return payload?.status === 'SUCCESS' && payload?.val === 'TRUE';
      }
    } catch {}
    return false;
  }

  /**
   * Checks cloud single source of truth for student submission.
   * If the student submission has been reset (val === 'NONE' or not submitted),
   * purges any stale localStorage completion & lock flags so the student can take the test.
   * Returns true if student is confirmed SUBMITTED on the cloud, false otherwise.
   */
  public static async checkAndSyncStudentSubmissionStatus(rawPrn: string, tid?: string): Promise<boolean> {
    if (!rawPrn) return false;
    const cleanPrn = rawPrn.toUpperCase().trim();
    const testId = tid || DEFAULT_HARIPRASAD_PRACTICAL_TEST.id;

    // Direct check: if student was specifically reset by faculty
    const isReset = await this.isStudentReset(cleanPrn);
    if (isReset) {
      try {
        if (typeof window !== 'undefined') {
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i);
            if (k && (
              k.includes(cleanPrn) ||
              k.startsWith('logicq_exam_test_start') ||
              k.startsWith('logicq_exam_q_start') ||
              k.startsWith('logicq_exam_locked') ||
              k.startsWith('logicq_exam_proctor_') ||
              k.startsWith('logicq_exam_violations') ||
              k.startsWith('logicq_exam_student_submitted_') ||
              k.startsWith('logicq_exam_test_completed_') ||
              k.startsWith('logicq_exam_auto_submitted_') ||
              k.startsWith('logicq_exam_draft_') ||
              k.startsWith('logicq_exam_in_progress_') ||
              k.startsWith('logicq_exam_q_completed_')
            )) {
              localStorage.removeItem(k);
            }
          }
          localStorage.removeItem('logicq_exam_test_completed_test-assessment-4');
          localStorage.removeItem('logicq_exam_test_completed_assessment-4');
          localStorage.removeItem('logicq_exam_test_completed_test-continuous-arrays-search-sort');
          localStorage.removeItem('logicq_exam_proctor_locked');
          localStorage.removeItem('logicq_exam_proctor_lock_reason');
          localStorage.removeItem('logicq_exam_locked_test-assessment-4');
          localStorage.removeItem('logicq_exam_locked_assessment-4');
          localStorage.removeItem('logicq_exam_locked_test-continuous-arrays-search-sort');
          localStorage.setItem(`logicq_exam_unlocked_test-continuous-arrays-search-sort_${cleanPrn}`, 'true');
          localStorage.setItem(`logicq_exam_unlocked_test-assessment-4_${cleanPrn}`, 'true');
          localStorage.setItem(`logicq_exam_unlocked_assessment-4_${cleanPrn}`, 'true');
          localStorage.setItem(`logicq_exam_unlocked_${testId}_${cleanPrn}`, 'true');
          localStorage.setItem(`logicq_student_reset_${cleanPrn}`, 'true');
        }
      } catch {}
      return false;
    }

    try {
      const isA4 = Boolean(
        testId.includes('assessment-4') ||
        testId === 'test-assessment-4' ||
        testId === 'assessment-4' ||
        testId.includes('arrays') ||
        testId === 'test-continuous-arrays-search-sort'
      );
      const subKey = isA4 ? `lq_sub_a4_${cleanPrn}` : `lq_sub_lab_${cleanPrn}`;
      const res = await fetch(`https://api.keyval.org/get/${subKey}`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        if (data && data.status === 'SUCCESS' && data.val && data.val !== 'NONE') {
          return true;
        }
      }
    } catch {}

    return false;
  }

  /**
   * Fetches live submissions from cloud mesh for present students & registered submitters
   */
  public static async fetchLiveSubmissionsFromCloud(
    targetPrns: string[],
    targetTestId?: string
  ): Promise<any[]> {
    if (!Array.isArray(targetPrns) || targetPrns.length === 0) return [];
    const results: any[] = [];
    const isA4 = Boolean(
      targetTestId && (
        targetTestId.includes('assessment-4') ||
        targetTestId === 'test-assessment-4' ||
        targetTestId === 'assessment-4' ||
        targetTestId.includes('arrays') ||
        targetTestId === 'test-continuous-arrays-search-sort'
      )
    );

    // Also get PRNs from cloud index
    const allPrnsSet = new Set<string>(targetPrns.map((p) => p.toUpperCase().trim()));
    try {
      const indexKey = isA4 ? 'lq_submitted_a4_prns' : 'lq_submitted_prns_v2026';
      const res = await fetch(`https://api.keyval.org/get/${indexKey}`, { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        const payload = await res.json();
        if (payload?.status === 'SUCCESS' && payload?.val && payload.val !== 'NONE') {
          const list = String(payload.val).split(',').map((p) => p.trim().toUpperCase()).filter(Boolean);
          list.forEach((p) => allPrnsSet.add(p));
        }
      }
    } catch {}

    const prnsToFetch = Array.from(allPrnsSet);
    await Promise.all(
      prnsToFetch.map(async (prn) => {
        try {
          const subKey = isA4 ? `lq_sub_a4_${prn}` : `lq_sub26_${prn}`;
          const res = await fetch(`https://api.keyval.org/get/${subKey}`, { signal: AbortSignal.timeout(1800) });
          if (!res.ok) return;
          const data = await res.json();
          if (data?.status === 'SUCCESS' && data?.val && data.val !== 'NONE') {
            const rawVal = String(data.val).trim();
            const parts = rawVal.split('|').filter(Boolean);
            const [assignedQ1, assignedQ2] = isA4 ? getStudentAssessment4Pair(prn) : getStudentLabExamPair(prn);
            parts.forEach((part) => {
              const [qKey, scoreStr, exitsStr, tabsStr, timeStr, copyPasteStr, keystrokesStr, burstStr, cpmStr] = part.split(':');
              const isQ1 = qKey === 'Q1';
              const assigned = isQ1 ? assignedQ1 : assignedQ2;
              const parsedCpm = Number(cpmStr) || 0;
              results.push({
                id: `cloud_${prn}_${qKey}`,
                studentPrn: prn,
                prn,
                testId: targetTestId || (isA4 ? 'test-assessment-4' : 'lab-internal'),
                problemId: assigned?.id || (isQ1 ? 'q1' : 'q2'),
                problemSlug: assigned?.id || (isQ1 ? 'q1' : 'q2'),
                problemTitle: assigned?.title || (isQ1 ? 'Arrays' : 'Searching'),
                difficulty: isQ1 ? 'EASY' : 'MEDIUM',
                academicScore: !isNaN(Number(scoreStr)) ? Number(scoreStr) : 0,
                score: !isNaN(Number(scoreStr)) ? Number(scoreStr) : 0,
                verdict: (!isNaN(Number(scoreStr)) && Number(scoreStr) > 0) ? 'ACCEPTED' : (Number(exitsStr) >= 2 || Number(tabsStr) >= 2 ? 'PROCTOR_LOCKED' : 'WRONG_ANSWER'),
                timeTakenSeconds: Number(timeStr) || 0,
                fullscreenExits: Number(exitsStr) || 0,
                tabSwitchCount: Number(tabsStr) || 0,
                copyPasteAttempts: Number(copyPasteStr) || 0,
                totalKeystrokes: Number(keystrokesStr) || 0,
                largestBurstChars: Number(burstStr) || 0,
                cpm: parsedCpm,
                typingVelocityCPM: parsedCpm,
                submittedAt: new Date(Date.now() - 3600000).toISOString(),
              });
            });
          }
        } catch {}
      })
    );

    return results;
  }

  /**
   * Connects student's portal to real-time attendance stream with zero-latency
   */
  public static listenToStudentAttendance(
    testId: string,
    rawPrn: string,
    onStatusChange: (isPresent: boolean) => void
  ): () => void {
    if (!rawPrn) return () => {};
    const cleanPrn = rawPrn.toUpperCase().trim();
    const aliases = this.canonicalTestAliases(testId);

    // 1. Check local storage right now
    const isInitialPres = this.isLocallyPresent(testId, cleanPrn);
    onStatusChange(Boolean(isInitialPres));

    const processPayload = (rawMsg: any) => {
      let payload: any = null;
      if (typeof rawMsg === 'string') {
        try {
          payload = JSON.parse(rawMsg);
        } catch {
          payload = null;
        }
      } else if (rawMsg && typeof rawMsg === 'object') {
        payload = rawMsg;
      }

      if (!payload) return;

      if (payload.type === 'TEST_STATUS_CHANGED' && payload.status) {
        const s = String(payload.status);
        aliases.forEach((tid) => {
          localStorage.setItem(`logicq_test_status_${tid}`, s);
        });
        if (payload.testId) {
          localStorage.setItem(`logicq_test_status_${payload.testId}`, s);
        }
        localStorage.setItem('logicq_master_test_status', s);
        this.statusListeners.forEach((cb) => {
          try {
            cb(payload.testId || testId, s);
          } catch {}
        });
        RealtimeSyncService.emit('TESTS');
        return;
      }

      if (payload.type === 'ATTENDANCE_CONFIRMED') {
        const conf = Boolean(payload.confirmed);
        aliases.forEach((tid) => {
          localStorage.setItem(`logicq_attendance_confirmed_${tid}`, conf ? 'true' : 'false');
        });
        if (payload.testId) {
          localStorage.setItem(`logicq_attendance_confirmed_${payload.testId}`, conf ? 'true' : 'false');
        }
        if (Array.isArray(payload.presentPrns)) {
          const isPres = payload.presentPrns.includes(cleanPrn);
          if (isPres) {
            aliases.forEach((tid) => {
              localStorage.setItem(`logicq_lab_attendance_${tid}_${cleanPrn}`, 'PRESENT');
            });
            localStorage.setItem(`logicq_lab_attendance_any_${cleanPrn}`, 'PRESENT');
            localStorage.setItem(`logicq_student_present_in_lab_${cleanPrn}`, 'true');
            localStorage.setItem(`logicq_verified_present_${cleanPrn}`, 'true');
          } else {
            aliases.forEach((tid) => {
              localStorage.setItem(`logicq_lab_attendance_${tid}_${cleanPrn}`, 'ABSENT');
            });
            localStorage.removeItem(`logicq_lab_attendance_any_${cleanPrn}`);
            localStorage.removeItem(`logicq_student_present_in_lab_${cleanPrn}`);
            localStorage.removeItem(`logicq_verified_present_${cleanPrn}`);
          }
          onStatusChange(Boolean(isPres));
          return;
        }
      }

      if (!payload.prn) return;
      const pPrn = String(payload.prn).toUpperCase().trim();
      if (pPrn === cleanPrn) {
        const isPres = Boolean(payload.isPresent);
        aliases.forEach((tid) => {
          localStorage.setItem(`logicq_lab_attendance_${tid}_${cleanPrn}`, isPres ? 'PRESENT' : 'ABSENT');
        });
        if (payload.testId) {
          localStorage.setItem(`logicq_lab_attendance_${payload.testId}_${cleanPrn}`, isPres ? 'PRESENT' : 'ABSENT');
        }
        if (isPres) {
          localStorage.setItem(`logicq_lab_attendance_any_${cleanPrn}`, 'PRESENT');
          localStorage.setItem(`logicq_student_present_in_lab_${cleanPrn}`, 'true');
          localStorage.setItem(`logicq_verified_present_${cleanPrn}`, 'true');
        } else {
          localStorage.removeItem(`logicq_lab_attendance_any_${cleanPrn}`);
          localStorage.removeItem(`logicq_student_present_in_lab_${cleanPrn}`);
          localStorage.removeItem(`logicq_verified_present_${cleanPrn}`);
        }
        onStatusChange(Boolean(isPres));
      }
    };

    // 2. Connect to live SSE stream for real-time live events only (no historical 6-hour message replay)
    let eventSource: EventSource | null = null;
    try {
      if (typeof window !== 'undefined' && 'EventSource' in window) {
        eventSource = new EventSource(`${NTFY_URL}/sse`);
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.message) {
              processPayload(data.message);
            }
          } catch {}
        };
      }
    } catch {}

    // 3. Multi-tab storage event
    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key.includes('lab_attendance') || e.key === 'logicq_storage_sync_pulse' || e.key.includes('attendance_confirmed') || e.key.includes('student_present')) {
        const pres = this.isLocallyPresent(testId, cleanPrn);
        onStatusChange(Boolean(pres));
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
    }

    // 4. RealtimeSync listener
    const unsubRealtime = RealtimeSyncService.on('TESTS', () => {
      const pres = this.isLocallyPresent(testId, cleanPrn);
      onStatusChange(Boolean(pres));
    });

    // 5. Periodic local sync check
    const interval = setInterval(() => {
      const pres = this.isLocallyPresent(testId, cleanPrn);
      onStatusChange(Boolean(pres));
    }, 4000);

    return () => {
      if (eventSource) eventSource.close();
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorage);
      }
      unsubRealtime();
      clearInterval(interval);
    };
  }

  /**
   * Listens to all student attendance updates for Admin Console
   */
  public static listenAllAttendance(
    testId: string,
    onUpdate: (map: Record<string, boolean>) => void
  ): () => void {
    const aliases = this.canonicalTestAliases(testId);

    const getLocalMap = (): Record<string, boolean> => {
      const map: Record<string, boolean> = {};
      if (typeof window === 'undefined') return map;
      try {
        const prefix = 'logicq_lab_attendance_';
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(prefix)) {
            const val = localStorage.getItem(k);
            const isPres = val === 'PRESENT';
            const parts = k.replace(prefix, '').split('_');
            const prn = parts[parts.length - 1]?.toUpperCase().trim();
            if (prn && prn.length >= 8 && !prn.includes('TEST') && !prn.includes('ALL')) {
              if (isPres) {
                map[prn] = true;
              } else if (map[prn] === undefined) {
                map[prn] = false;
              }
            }
          } else if (k && k.startsWith('logicq_student_present_in_lab_') && localStorage.getItem(k) === 'true') {
            const prn = k.replace('logicq_student_present_in_lab_', '').toUpperCase().trim();
            if (prn && prn.length >= 8) {
              map[prn] = true;
            }
          }
        }
      } catch {}
      return map;
    };

    onUpdate(getLocalMap());

    // Connect to SSE stream
    let eventSource: EventSource | null = null;
    try {
      if (typeof window !== 'undefined' && 'EventSource' in window) {
        eventSource = new EventSource(`${NTFY_URL}/sse`);
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.message) {
              const payload = typeof data.message === 'string' ? JSON.parse(data.message) : data.message;
              if (payload?.type === 'TEST_STATUS_CHANGED' && payload?.status) {
                const s = String(payload.status);
                aliases.forEach((tid) => {
                  localStorage.setItem(`logicq_test_status_${tid}`, s);
                });
                if (payload.testId) {
                  localStorage.setItem(`logicq_test_status_${payload.testId}`, s);
                }
                localStorage.setItem('logicq_master_test_status', s);
                this.statusListeners.forEach((cb) => {
                  try {
                    cb(payload.testId || testId, s);
                  } catch {}
                });
                RealtimeSyncService.emit('TESTS');
                return;
              }
              if (payload.prn) {
                const cleanPrn = payload.prn.toUpperCase().trim();
                const isPres = Boolean(payload.isPresent);
                aliases.forEach((tid) => {
                  localStorage.setItem(`logicq_lab_attendance_${tid}_${cleanPrn}`, isPres ? 'PRESENT' : 'ABSENT');
                });
                onUpdate(getLocalMap());
              }
            }
          } catch {}
        };
      }
    } catch {}

    const handleStorage = () => onUpdate(getLocalMap());
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
    }
    const unsubRealtime = RealtimeSyncService.on('TESTS', () => onUpdate(getLocalMap()));

    return () => {
      if (eventSource) eventSource.close();
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorage);
      }
      unsubRealtime();
    };
  }
}
