import { FirestoreDataService } from './firestoreData.service.js';
import { RealtimeSyncService } from './realtimeSync.service.js';
import { getSolvedPracticeTopicIds } from '../pages/TopicPracticeHubPage.js';
import { TOPIC_PRACTICE_DATA } from '../data/topic-practice.data.js';
import { PRACTICE_MODULE_1_PROBLEMS } from '../data/practice-module1.data.js';
import { PRACTICE_MODULE_2_PROBLEMS } from '../data/practice-module2.data.js';
import { PRACTICE_MODULE_3_PROBLEMS } from '../data/practice-module3.data.js';
import { PRACTICE_MODULE_4_PROBLEMS } from '../data/practice-module4.data.js';
import { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface LogicQBackupData {
  app: 'LogicQ';
  schemaVersion: '2.0';
  backupCreatedAt: string;
  backupFilename: string;
  institution: string;
  department: string;
  candidate: {
    fullName: string;
    displayName: string;
    prn: string;
    email: string;
    college: string;
    department: string;
    year: string;
    role: string;
  };
  academicRecord: {
    cieMarks: number;
    practiceSolvedCount: number;
    labSolvedCount: number;
    totalSolved: number;
    totalPoints: number;
    compilerAccuracy: number;
  };
  solvedPracticeTopicIds: string[];
  solvedLabProblemSlugs: string[];
  codeDrafts: Record<string, { code: string; updatedAt: string; topicTitle?: string }>;
  submissions: any[];
  proctoringTelemetry: {
    integrityScore: number;
    tabSwitches: number;
    fullscreenExits: number;
    clipboardAttempts: number;
    autoLockCount: number;
  };
}

const BACKUP_TIMESTAMP_KEY = 'logicq_last_backup_downloaded_at';
const BACKUP_DISMISSED_KEY = 'logicq_backup_reminder_dismissed_date';

/**
 * Checks if the student has downloaded a backup today
 */
export function hasDownloadedBackupToday(): boolean {
  try {
    const lastDownloaded = localStorage.getItem(BACKUP_TIMESTAMP_KEY);
    if (!lastDownloaded) return false;
    const downloadedDate = new Date(Number(lastDownloaded) || lastDownloaded).toDateString();
    const today = new Date().toDateString();
    return downloadedDate === today;
  } catch {
    return false;
  }
}

/**
 * Checks if the daily reminder was dismissed today
 */
export function isBackupReminderDismissedToday(): boolean {
  try {
    const dismissed = localStorage.getItem(BACKUP_DISMISSED_KEY);
    if (!dismissed) return false;
    return dismissed === new Date().toDateString();
  } catch {
    return false;
  }
}

export function dismissBackupReminderToday(): void {
  try {
    localStorage.setItem(BACKUP_DISMISSED_KEY, new Date().toDateString());
  } catch {}
}

export function recordBackupDownloaded(): void {
  try {
    localStorage.setItem(BACKUP_TIMESTAMP_KEY, String(Date.now()));
  } catch {}
}

/**
 * Generates and triggers download of comprehensive LogicQ Backup JSON
 */
export async function exportCompleteStudentBackup(user: any, profile?: any): Promise<string> {
  const effectiveUid = user?.id || user?.uid || 'student';
  const prn = (user?.prn || '2126PMIM1039').trim().toUpperCase();
  const studentName = user?.fullName || user?.displayName || user?.name || 'Student';

  // 1. Gather all solved practice topic IDs
  const solvedPracticeTopicIds = Array.from(new Set([
    ...getSolvedPracticeTopicIds(),
    ...(user?.id ? getSolvedPracticeTopicIds(user.id) : []),
    ...(user?.prn ? getSolvedPracticeTopicIds(user.prn) : []),
  ]));

  // 2. Gather all code drafts from localStorage
  const codeDrafts: Record<string, { code: string; updatedAt: string; topicTitle?: string }> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('logicq_practice_draft_') || key.startsWith('logicq_code_draft_'))) {
        const topicSlug = key.replace('logicq_practice_draft_', '').replace('logicq_code_draft_', '');
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            const topicItem = TOPIC_PRACTICE_DATA.find((t) => t.id === topicSlug);
            codeDrafts[topicSlug] = {
              code: parsed.code || (typeof parsed === 'string' ? parsed : ''),
              updatedAt: parsed.timestamp || parsed.updatedAt || new Date().toISOString(),
              topicTitle: topicItem?.problem?.title || topicSlug,
            };
          } catch {
            codeDrafts[topicSlug] = {
              code: raw,
              updatedAt: new Date().toISOString(),
            };
          }
        }
      }
    }
  } catch {}

  // 3. Gather submissions from memory & Firestore
  let submissions: any[] = [];
  try {
    const rawSubs = localStorage.getItem('logicq_fallback_submissions_v1');
    if (rawSubs) {
      const parsed = JSON.parse(rawSubs);
      if (Array.isArray(parsed)) submissions.push(...parsed);
    }
  } catch {}

  if (profile?.recentSubmissions && Array.isArray(profile.recentSubmissions)) {
    submissions.push(...profile.recentSubmissions);
  }

  // Deduplicate submissions
  const subMap = new Map<string, any>();
  submissions.forEach((s) => {
    const id = s.id || `${s.problemId || s.problem?.slug}_${s.createdAt}`;
    if (id && !subMap.has(id)) subMap.set(id, s);
  });
  const uniqueSubmissions = Array.from(subMap.values());

  // 4. Lab Internal Solved Detection
  const allLabProblems = [
    ...PRACTICE_MODULE_1_PROBLEMS,
    ...PRACTICE_MODULE_2_PROBLEMS,
    ...PRACTICE_MODULE_3_PROBLEMS,
    ...PRACTICE_MODULE_4_PROBLEMS,
  ];
  const acSlugs = new Set(
    uniqueSubmissions
      .filter((s: any) => s.verdict === 'ACCEPTED')
      .map((s: any) => (s.problemSlug || s.problem?.slug || '').toLowerCase().trim())
  );
  const solvedLabProblemSlugs = allLabProblems
    .filter((p) => acSlugs.has(p.slug.toLowerCase().trim()))
    .map((p) => p.slug);

  const labSolvedCount = solvedLabProblemSlugs.length;
  const cieMarks = Math.min(20.0, Number(((labSolvedCount / 80) * 20.0).toFixed(1)));
  const totalSolved = solvedPracticeTopicIds.length + labSolvedCount;

  // 5. Proctoring Telemetry
  let telemetry = {
    integrityScore: 100,
    tabSwitches: 0,
    fullscreenExits: 0,
    clipboardAttempts: 0,
    autoLockCount: 0,
  };
  try {
    const rawTel = localStorage.getItem(`logicq_proctoring_telemetry_${prn}`);
    if (rawTel) {
      const parsed = JSON.parse(rawTel);
      telemetry = {
        integrityScore: parsed.integrityScore ?? 100,
        tabSwitches: parsed.tabSwitchCount ?? 0,
        fullscreenExits: parsed.fullscreenExits ?? 0,
        clipboardAttempts: parsed.copyPasteAttempts ?? 0,
        autoLockCount: parsed.autoLockCount ?? 0,
      };
    }
  } catch {}

  // 6. Filename format: LogicQ_Backup_<PRN>_YYYY-MM-DD_HH-mm-ss.json
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());
  const safePrn = prn.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `LogicQ_Backup_${safePrn}_${year}-${month}-${day}_${hours}-${minutes}-${seconds}.json`;

  const backupData: LogicQBackupData = {
    app: 'LogicQ',
    schemaVersion: '2.0',
    backupCreatedAt: now.toISOString(),
    backupFilename: filename,
    institution: user?.college || 'Sanjivani University',
    department: user?.department || 'Integrated M.Tech',
    candidate: {
      fullName: studentName,
      displayName: user?.displayName || studentName,
      prn,
      email: user?.email || '',
      college: user?.college || 'Sanjivani University',
      department: user?.department || 'Integrated M.Tech',
      year: user?.year || 'FY',
      role: user?.role || 'STUDENT',
    },
    academicRecord: {
      cieMarks,
      practiceSolvedCount: solvedPracticeTopicIds.length,
      labSolvedCount,
      totalSolved,
      totalPoints: totalSolved * 20,
      compilerAccuracy: 100,
    },
    solvedPracticeTopicIds,
    solvedLabProblemSlugs,
    codeDrafts,
    submissions: uniqueSubmissions,
    proctoringTelemetry: telemetry,
  };

  // Trigger file download
  const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  recordBackupDownloaded();
  return filename;
}

/**
 * Restores student data from an imported LogicQ Backup JSON file
 */
export async function restoreCompleteStudentBackup(
  jsonString: string,
  currentUser: any,
  queryClient?: QueryClient
): Promise<{ success: boolean; message: string; restoredCount: number }> {
  try {
    const data: LogicQBackupData = JSON.parse(jsonString);

    if (!data || (data.app !== 'LogicQ' && !data.solvedPracticeTopicIds && !data.candidate)) {
      throw new Error('Invalid backup file. Please select a valid LogicQ_Backup_*.json file.');
    }

    const currentPrn = (currentUser?.prn || '').trim().toUpperCase();
    const backupPrn = (data.candidate?.prn || '').trim().toUpperCase();

    // Friendly confirmation if PRNs do not match
    if (currentPrn && backupPrn && currentPrn !== backupPrn) {
      const confirmDiff = window.confirm(
        `This backup belongs to PRN "${backupPrn}", but your active account is "${currentPrn}".\n\nDo you want to proceed and restore these problem solutions and codes into your account?`
      );
      if (!confirmDiff) {
        return { success: false, message: 'Restore cancelled by user.', restoredCount: 0 };
      }
    }

    const effectiveUid = currentUser?.id || currentUser?.uid || `cohort-${(currentPrn || backupPrn).toLowerCase()}`;
    const solvedIds = Array.from(new Set(data.solvedPracticeTopicIds || []));

    // 1. Restore solved practice topics to all local storage keys
    try {
      localStorage.setItem('logicq_solved_practice_topics', JSON.stringify(solvedIds));
      if (effectiveUid) {
        localStorage.setItem(`logicq_solved_practice_topics_${effectiveUid}`, JSON.stringify(solvedIds));
        localStorage.setItem(`logicq_practice_progress_${effectiveUid}`, JSON.stringify(solvedIds));
      }
      if (currentPrn) {
        localStorage.setItem(`logicq_solved_practice_topics_${currentPrn}`, JSON.stringify(solvedIds));
      }
    } catch {}

    // 2. Restore all C code drafts
    let draftCount = 0;
    if (data.codeDrafts && typeof data.codeDrafts === 'object') {
      Object.entries(data.codeDrafts).forEach(([topicId, item]) => {
        if (item && item.code) {
          try {
            localStorage.setItem(
              `logicq_practice_draft_${topicId}`,
              JSON.stringify({
                code: item.code,
                timestamp: item.updatedAt || new Date().toISOString(),
                savedAt: Date.now(),
              })
            );
            draftCount++;
          } catch {}
        }
      });
    }

    // 3. Restore submissions
    if (Array.isArray(data.submissions) && data.submissions.length > 0) {
      try {
        const existing = JSON.parse(localStorage.getItem('logicq_fallback_submissions_v1') || '[]');
        const existingIds = new Set(existing.map((s: any) => s.id));
        const merged = [...existing];
        data.submissions.forEach((s) => {
          if (s && s.id && !existingIds.has(s.id)) {
            merged.push(s);
            existingIds.add(s.id);
          }
        });
        localStorage.setItem('logicq_fallback_submissions_v1', JSON.stringify(merged));
      } catch {}
    }

    // 4. Cloud sync to Firestore
    try {
      await FirestoreDataService.savePracticeProgress(effectiveUid, solvedIds);
      await FirestoreDataService.saveStatsBackup(effectiveUid, {
        totalSolved: data.academicRecord?.totalSolved || solvedIds.length,
        totalPoints: data.academicRecord?.totalPoints || solvedIds.length * 20,
        completedProblems: solvedIds,
      });
    } catch (fsErr) {
      console.warn('Firestore backup restore sync notice:', fsErr);
    }

    // 5. Invalidate caches and trigger instant UI re-render
    if (queryClient) {
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      await queryClient.invalidateQueries({ queryKey: ['student-dashboard-analytics'] });
      await queryClient.invalidateQueries({ queryKey: ['proctoring-telemetry-student'] });
    }

    RealtimeSyncService.emit('SUBMISSIONS');
    RealtimeSyncService.emit('USERS');

    return {
      success: true,
      message: `Restored ${solvedIds.length} solved problems and ${draftCount} C code drafts successfully!`,
      restoredCount: solvedIds.length,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Failed to restore backup file.',
      restoredCount: 0,
    };
  }
}
