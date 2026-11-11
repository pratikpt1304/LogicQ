import React, { useState, useEffect, useMemo } from 'react';
import { collection, doc, onSnapshot, getDocs, updateDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase.js';
import { FirestoreDataService } from '../../services/firestoreData.service.js';
import { DeviceSessionService } from '../../services/deviceSession.service.js';
import { RealtimeSyncService } from '../../services/realtimeSync.service.js';
import { toast } from 'sonner';
import {
  Award,
  CheckCircle2,
  Clock,
  Download,
  FolderLock,
  Lock,
  ShieldCheck,
  Sparkles,
  Unlock,
  X,
  Activity,
  FileCode2,
  AlertCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Code2,
  Terminal,
  Smartphone,
  RotateCcw,
  Ban,
  UserX,
  AlertOctagon,
  Trash2,
  ShieldAlert,
  KeyRound,
} from 'lucide-react';
import { generateIndividualStudentPdf } from '../../utils/studentPdfGenerator.js';
import { TOPIC_PRACTICE_DATA } from '../../data/topic-practice.data.js';

const resolvePracticeModule = (sub: any): string => {
  const probId = String(sub.problemId || sub.problemSlug || '').trim().toLowerCase();
  const probTitle = String(sub.problemTitle || sub.title || '').trim().toLowerCase();
  const matched = TOPIC_PRACTICE_DATA.find((t) =>
    t.id.toLowerCase() === probId ||
    t.topicTitle.toLowerCase() === probTitle ||
    t.problem.title.toLowerCase() === probTitle ||
    (probId && t.id.toLowerCase().includes(probId)) ||
    (probTitle && t.topicTitle.toLowerCase().includes(probTitle)) ||
    (probTitle && t.problem.title.toLowerCase().includes(probTitle))
  );

  if (matched?.moduleTitle) {
    return matched.moduleTitle;
  }
  if (matched?.moduleIndex) {
    return `Module ${matched.moduleIndex}`;
  }
  if (sub.testTitle && sub.testTitle !== 'Continuous Practical Lab') {
    return sub.testTitle;
  }
  return 'Module 1: C Fundamentals';
};

export const formatTimeDuration = (seconds?: number | string | null): string => {
  const s = Math.round(Number(seconds) || 0);
  if (s <= 0) return '< 1m';
  const mins = Math.floor(s / 60);
  const remSecs = s % 60;
  if (mins === 0) return `${remSecs}s`;
  if (remSecs === 0) return `${mins}m`;
  return `${mins}m ${remSecs}s`;
};

interface StudentDeepDiveModalProps {
  student: any;
  onClose: () => void;
  onToggleMiniProject: (studentId: string, currentStatus: boolean) => void;
  onStudentPurged?: (prn: string) => void;
  onStudentBanChanged?: (prn: string, isBanned: boolean) => void;
}

export const StudentDeepDiveModal: React.FC<StudentDeepDiveModalProps> = ({
  student,
  onClose,
  onToggleMiniProject,
  onStudentPurged,
  onStudentBanChanged,
}) => {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [liveCohort, setLiveCohort] = useState<any>(null);
  const [telemetryDraft, setTelemetryDraft] = useState<any>(null);
  const [testSubmissions, setTestSubmissions] = useState<any[]>([]);
  const [practiceSubmissions, setPracticeSubmissions] = useState<any[]>([]);
  const [topicAttemptsDraft, setTopicAttemptsDraft] = useState<Record<string, number>>({});
  const liveCohortRef = React.useRef<any>(null);
  liveCohortRef.current = liveCohort;
  const [activeTab, setActiveTab] = useState<'lab_internal' | 'practice' | 'overview'>('practice');
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [editingMarksMap, setEditingMarksMap] = useState<Record<string, number>>({});
  const [isSavingMarks, setIsSavingMarks] = useState(false);

  const handleSaveManualMarks = async (sub: any, awarded: number) => {
    try {
      setIsSavingMarks(true);
      const maxMarks = Number(sub.maxMarks || 10);
      const awardedScore = Math.max(0, Math.min(Number(awarded) || 0, maxMarks));
      const targetPrn = student?.prn || sub.studentPrn || sub.prn;

      // 1. Update in assessment_test_submissions if exists
      if (sub.id) {
        const assessRef = doc(db, 'assessment_test_submissions', sub.id);
        await updateDoc(assessRef, {
          academicScore: awardedScore,
          marksAwarded: awardedScore,
          score: awardedScore,
          manualGradingRequired: false,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }

      // 2. Also search and update in submissions collection
      if (targetPrn) {
        const subQ = query(collection(db, 'submissions'), where('studentPrn', '==', targetPrn));
        const snap = await getDocs(subQ).catch(() => null);
        if (snap && !snap.empty) {
          for (const d of snap.docs) {
            const data = d.data();
            if (data.problemId === sub.problemId || data.problemTitle === sub.problemTitle || d.id === sub.id) {
              await updateDoc(d.ref, {
                academicScore: awardedScore,
                marksAwarded: awardedScore,
                score: awardedScore,
                manualGradingRequired: false,
                updatedAt: serverTimestamp(),
              }).catch(() => {});
            }
          }
        }
      }

      // 3. Emit real-time sync across system
      RealtimeSyncService.emit('SUBMISSIONS');
      RealtimeSyncService.emit('DASHBOARD');
      RealtimeSyncService.emit('TESTS');
      toast.success(`Marks updated to ${awardedScore} / ${maxMarks}! Synced to student gradebook in real-time.`);
    } catch (err: any) {
      toast.error('Failed to update marks: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsSavingMarks(false);
    }
  };

  const studentName = student?.fullName || student?.name || 'Student Candidate';
  const prnRaw = (student?.prn || '').trim();
  const prn = prnRaw && prnRaw !== '—' ? prnRaw.toUpperCase() : 'N/A';
  const email = (student?.email || '').trim();
  const studentUid = String(student?.id || student?.uid || '').trim();
  const sectionName = student?.section || student?.sectionName || 'Integrated Mtech';

  // 1. Comprehensive multi-key real-time Firestore synchronization
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    // Keys to listen for in cohort_progress & enrolled_students
    const candidateKeys = new Set<string>();
    if (prn && prn !== 'N/A') {
      candidateKeys.add(prn);
      candidateKeys.add(prn.replace(/0/g, 'O'));
      candidateKeys.add(prn.replace(/O/g, '0'));
      if (prn.includes('PMIM')) candidateKeys.add(prn.replace('PMIM', 'PMIF'));
      if (prn.includes('PMIF')) candidateKeys.add(prn.replace('PMIF', 'PMIM'));
    }
    if (studentUid) {
      candidateKeys.add(studentUid);
      candidateKeys.add(studentUid.toUpperCase());
    }

    // A. Listen to candidate cohort_progress and enrolled_students docs
    candidateKeys.forEach((key) => {
      try {
        const u = onSnapshot(
          doc(db, 'cohort_progress', key),
          (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              setLiveCohort((prev: any) => {
                const nextCohort = {
                  ...(prev || {}),
                  ...data,
                  moduleProgress: {
                    ...(prev?.moduleProgress || {}),
                    ...(data?.moduleProgress || {}),
                  }
                };
                liveCohortRef.current = nextCohort;
                return nextCohort;
              });
              updateCategorizedSubmissions();
            }
          },
          () => {}
        );
        unsubs.push(u);

        const uEnrolled = onSnapshot(
          doc(db, 'enrolled_students', key),
          (snap) => {
            if (snap.exists()) {
              const eData = snap.data();
              setLiveCohort((prev: any) => {
                const nextCohort = {
                  ...(prev || {}),
                  ...eData,
                  moduleProgress: {
                    ...(prev?.moduleProgress || {}),
                    ...(eData?.moduleProgress || {}),
                  }
                };
                liveCohortRef.current = nextCohort;
                return nextCohort;
              });
              updateCategorizedSubmissions();
            }
          },
          () => {}
        );
        unsubs.push(uEnrolled);

        // Also listen to live proctoring telemetry draft
        const uDraft = onSnapshot(
          doc(db, 'cohort_progress', key, 'drafts', 'proctoring_telemetry'),
          (snap) => {
            if (snap.exists()) {
              try {
                const raw = snap.data()?.code;
                if (raw) setTelemetryDraft(JSON.parse(raw));
                else setTelemetryDraft(snap.data());
              } catch {
                setTelemetryDraft(snap.data());
              }
            }
          },
          () => {}
        );
        unsubs.push(uDraft);

        // Listen to topic_attempts draft
        const uAttempts = onSnapshot(
          doc(db, 'cohort_progress', key, 'drafts', 'topic_attempts'),
          (snap) => {
            if (snap.exists()) {
              setTopicAttemptsDraft(snap.data() || {});
              updateCategorizedSubmissions();
            }
          },
          () => {}
        );
        unsubs.push(uAttempts);

        // Also listen to all practice solution drafts in cohort_progress/{key}/drafts
        const uDraftsColl = onSnapshot(
          collection(db, 'cohort_progress', key, 'drafts'),
          (snap) => {
            snap.forEach((d) => {
              const data = d.data();
              const draftId = d.id;
              if (
                draftId.startsWith('practice_topic_') ||
                draftId.startsWith('topic_') ||
                /^(m\d+-|practice-|topic-|kanetkar-)/i.test(draftId)
              ) {
                const cleanSlug = draftId
                  .replace(/^practice_topic_/, '')
                  .replace(/^topic_/, '');
                rawPracticeDrafts[cleanSlug] = { id: draftId, ...data };
                rawPracticeDrafts[draftId] = { id: draftId, ...data };
              }
            });
            updateCategorizedSubmissions();
          },
          () => {}
        );
        unsubs.push(uDraftsColl);
      } catch {}
    });

    let rawAssess: any[] = [];
    let rawGeneral: any[] = [];
    const rawPracticeDrafts: Record<string, any> = {};

    const safeTimestampMs = (val: any): number => {
      if (!val) return 0;
      if (typeof val === 'number') return val;
      if (val instanceof Date) return val.getTime();
      if (typeof val?.toDate === 'function') {
        try {
          const d = val.toDate();
          if (d instanceof Date && !isNaN(d.getTime())) return d.getTime();
        } catch {}
      }
      if (typeof val?.seconds === 'number') {
        return val.seconds * 1000 + (val.nanoseconds ? Math.floor(val.nanoseconds / 1000000) : 0);
      }
      if (typeof val === 'string') {
        const t = new Date(val).getTime();
        if (!isNaN(t)) return t;
      }
      return 0;
    };

    const resolveCanonicalProblem = (sub: any) => {
      const rawId = String(
        sub?.problemId ||
        sub?.problemSlug ||
        sub?.problem?.id ||
        sub?.problem?.slug ||
        ''
      ).trim();

      const rawTitle = String(
        sub?.problemTitle ||
        sub?.problem?.title ||
        sub?.title ||
        ''
      ).trim();

      const cleanSlug = rawId
        .toLowerCase()
        .replace(/^practice_topic_/, '')
        .replace(/^topic_/, '');

      const matched = TOPIC_PRACTICE_DATA.find((t) => {
        const tId = t.id.toLowerCase();
        const tTitle = (t.topicTitle || '').toLowerCase();
        const pTitle = (t.problem?.title || '').toLowerCase();
        const lowSlug = cleanSlug.toLowerCase();
        const lowTitle = rawTitle.toLowerCase();

        return (
          (lowSlug && (tId === lowSlug || lowSlug.includes(tId) || tId.includes(lowSlug))) ||
          (lowTitle && (tTitle === lowTitle || pTitle === lowTitle || lowTitle.includes(pTitle) || pTitle.includes(lowTitle)))
        );
      });

      const canonicalId = matched ? matched.id : (cleanSlug || rawId || 'practice_prob');
      const canonicalTitle =
        matched?.topicTitle ||
        matched?.problem?.title ||
        (rawTitle && !/^(m\d+-|topic-|practice-)/i.test(rawTitle) ? rawTitle : null) ||
        (canonicalId.replace(/[-_]/g, ' ').toUpperCase());

      return { canonicalId, canonicalTitle, matchedTopic: matched };
    };

    const updateCategorizedSubmissions = () => {
      // 1. Group and deduplicate dual-writes across assessment_test_submissions and submissions
      const uniqueSubmissionsMap = new Map<string, any>();

      // Normalize all raw submissions first
      const normalizedSubs = [...rawAssess, ...rawGeneral].map((sub) => {
        const { canonicalId, canonicalTitle, matchedTopic } = resolveCanonicalProblem(sub);
        const timeMs = safeTimestampMs(sub.submittedAt || sub.createdAt || sub.updatedAt);
        const codeText = String(sub.code || sub.submittedCode || '').trim();

        return {
          ...sub,
          problemId: canonicalId,
          problemSlug: canonicalId,
          problemTitle: canonicalTitle,
          code: codeText || sub.code || '',
          submittedCode: codeText || sub.submittedCode || '',
          timestampMs: timeMs,
          submittedAt: timeMs > 0 ? new Date(timeMs).toISOString() : (sub.submittedAt || new Date().toISOString()),
          matchedTopic,
        };
      });

      // Sort chronologically ascending to merge dual-writes & determine attempts
      normalizedSubs.sort((a, b) => a.timestampMs - b.timestampMs);

      normalizedSubs.forEach((sub) => {
        const pId = sub.problemId;
        const codePrefix = sub.code.slice(0, 60);

        // Check if there is already an existing submission in uniqueSubmissionsMap for this problem
        // that is either within 3 minutes (dual write / quick retry) OR has the same attempt number
        let matchedKey: string | null = null;
        for (const [key, existing] of uniqueSubmissionsMap.entries()) {
          if (existing.problemId === pId) {
            const timeDiff = Math.abs(existing.timestampMs - sub.timestampMs);
            const isSameAttempt = Boolean(existing.attemptNumber && sub.attemptNumber && existing.attemptNumber === sub.attemptNumber);
            const isDualWrite = timeDiff <= 180000; // within 3 minutes
            const isSameCode = Boolean(codePrefix && existing.code.startsWith(codePrefix));

            if (isSameAttempt || isDualWrite || (timeDiff <= 600000 && isSameCode)) {
              matchedKey = key;
              break;
            }
          }
        }

        if (matchedKey) {
          const prev = uniqueSubmissionsMap.get(matchedKey);
          // Prefer whichever has more complete data / code
          const mergedCode = (sub.code && sub.code.length > (prev.code?.length || 0)) ? sub.code : (prev.code || sub.code);
          const mergedTitle = (prev.problemTitle && !/^(m\d+-|topic-)/i.test(prev.problemTitle))
            ? prev.problemTitle
            : (sub.problemTitle || prev.problemTitle);

          uniqueSubmissionsMap.set(matchedKey, {
            ...prev,
            ...sub,
            problemTitle: mergedTitle,
            code: mergedCode,
            submittedCode: mergedCode,
            timeTakenSeconds: Math.max(Number(prev.timeTakenSeconds || 0), Number(sub.timeTakenSeconds || 0), Number(prev.timeToSolveSeconds || 0), Number(sub.timeToSolveSeconds || 0)),
            timeToSolveSeconds: Math.max(Number(prev.timeToSolveSeconds || 0), Number(sub.timeToSolveSeconds || 0), Number(prev.timeTakenSeconds || 0), Number(sub.timeTakenSeconds || 0)),
            activeSeconds: Math.max(Number(prev.activeSeconds || 0), Number(sub.activeSeconds || 0), Number(prev.timeTakenSeconds || 0), Number(sub.timeTakenSeconds || 0)),
            points: Math.max(Number(prev.points || 0), Number(sub.points || 0), Number(prev.academicScore || 0), Number(sub.academicScore || 0)),
            academicScore: Math.max(Number(prev.academicScore || 0), Number(sub.academicScore || 0), Number(prev.points || 0), Number(sub.points || 0)),
            score: Math.max(Number(prev.score || 0), Number(sub.score || 0)),
            tabSwitchCount: Math.max(prev.tabSwitchCount || 0, sub.tabSwitchCount || 0),
            copyPasteAttempts: Math.max(prev.copyPasteAttempts || 0, sub.copyPasteAttempts || 0),
            fullscreenExits: Math.max(prev.fullscreenExits || 0, sub.fullscreenExits || 0),
            timestampMs: Math.max(prev.timestampMs || 0, sub.timestampMs || 0),
            submittedAt: (prev.timestampMs > sub.timestampMs ? prev.submittedAt : sub.submittedAt),
            verdict: (prev.verdict === 'ACCEPTED' || sub.verdict === 'ACCEPTED') ? 'ACCEPTED' : (sub.verdict || prev.verdict),
          });
        } else {
          const newKey = `sub_${pId}_${sub.timestampMs}_${Math.random().toString(36).slice(2, 6)}`;
          uniqueSubmissionsMap.set(newKey, sub);
        }
      });

      // 2. Synthesize and recover any solved practice problems from cohort_progress.completedProblems and drafts
      const currentCohort = liveCohortRef.current || liveCohort;
      const completedList: string[] = [
        ...(Array.isArray(currentCohort?.completedProblems) ? currentCohort.completedProblems : []),
        ...(Array.isArray(student?.completedProblems) ? student.completedProblems : []),
      ];
      const allKnownPracticeProblemIds = Array.from(new Set<string>([
        ...completedList,
        ...Object.keys(rawPracticeDrafts),
      ]));

      allKnownPracticeProblemIds.forEach((rawId) => {
        const probId = String(rawId || '').trim();
        if (
          !probId ||
          probId === 'topic_attempts' ||
          probId === 'proctoring_telemetry' ||
          probId === '__account_security' ||
          probId.startsWith('__') ||
          probId.includes('exam_') ||
          probId.includes('telemetry')
        ) {
          return;
        }

        const { canonicalId, canonicalTitle, matchedTopic } = resolveCanonicalProblem({ problemId: probId });

        // Check if uniqueSubmissionsMap ALREADY has a submission for canonicalId
        const existingEntry = Array.from(uniqueSubmissionsMap.values()).find(
          (s) => s.problemId === canonicalId || s.problemSlug === canonicalId
        );

        const draftObj =
          rawPracticeDrafts[probId] ||
          rawPracticeDrafts[canonicalId] ||
          rawPracticeDrafts[`practice_topic_${probId}`] ||
          rawPracticeDrafts[`practice_topic_${canonicalId}`] ||
          rawPracticeDrafts[`topic_${probId}`] ||
          {};

        const draftCode = String(draftObj.code || '').trim();

        if (existingEntry) {
          // If existing submission has empty/dummy code, and draft vault has real student C code, enrich it!
          if (draftCode && (!existingEntry.code || existingEntry.code.length < 25)) {
            existingEntry.code = draftCode;
            existingEntry.submittedCode = draftCode;
          }
          if (canonicalTitle && (!existingEntry.problemTitle || /^(m\d+-|topic-)/i.test(existingEntry.problemTitle))) {
            existingEntry.problemTitle = canonicalTitle;
          }
          if (!existingEntry.timeTakenSeconds && (draftObj.timeTakenSeconds || draftObj.timeToSolveSeconds)) {
            existingEntry.timeTakenSeconds = Number(draftObj.timeTakenSeconds || draftObj.timeToSolveSeconds);
            existingEntry.timeToSolveSeconds = Number(draftObj.timeTakenSeconds || draftObj.timeToSolveSeconds);
          }
          return;
        }

        // Only synthesize if actually marked completed or draft code exists
        const isActuallyCompleted = completedList.some((c) => {
          const { canonicalId: cId } = resolveCanonicalProblem({ problemId: String(c) });
          return cId === canonicalId;
        });

        if (isActuallyCompleted || draftCode.length > 0) {
          const topicAttemptsMap = {
            ...(currentCohort?.topicAttempts || {}),
            ...topicAttemptsDraft,
          } as Record<string, number>;

          const attempts = Number(
            topicAttemptsMap[canonicalId] ||
            topicAttemptsMap[probId] ||
            (matchedTopic && topicAttemptsMap[matchedTopic.id]) ||
            draftObj.attemptNumber ||
            1
          );

          const draftTimeMs = safeTimestampMs(draftObj.updatedAt) || safeTimestampMs(currentCohort?.lastSolvedDate) || Date.now();
          const submittedDate = new Date(draftTimeMs).toISOString();

          const synthesizedPracticeSub = {
            id: `practice_cohort_${canonicalId}`,
            problemId: canonicalId,
            problemSlug: canonicalId,
            problemTitle: canonicalTitle,
            code: draftCode || '// Solved and verified in practice arena',
            submittedCode: draftCode || '// Solved and verified in practice arena',
            language: 'c',
            verdict: 'ACCEPTED',
            status: 'PASSED',
            academicScore: 20,
            score: 20,
            points: 20,
            pointsAwarded: 20,
            maxMarks: 20,
            submissionType: 'PRACTICE',
            difficulty: matchedTopic?.problem?.difficulty || 'EASY',
            attemptNumber: Math.max(1, attempts),
            timeTakenSeconds: Number(draftObj.timeTakenSeconds || draftObj.timeToSolveSeconds || draftObj.activeSeconds || 0),
            timeToSolveSeconds: Number(draftObj.timeToSolveSeconds || draftObj.timeTakenSeconds || 0),
            timestampMs: draftTimeMs,
            submittedAt: submittedDate,
            createdAt: submittedDate,
            tabSwitchCount: 0,
            copyPasteAttempts: 0,
            fullscreenExits: 0,
            cpm: currentCohort?.typingVelocityCPM || currentCohort?.cpm || 0,
            testTitle: 'Continuous Practical Lab',
          };

          uniqueSubmissionsMap.set(`synth_${canonicalId}`, synthesizedPracticeSub);
        }
      });

      const all = Array.from(uniqueSubmissionsMap.values());

      // Sort chronologically ascending (oldest first) to accurately determine attempt order
      all.sort(
        (a, b) => (a.timestampMs || safeTimestampMs(a.submittedAt || a.createdAt)) - (b.timestampMs || safeTimestampMs(b.submittedAt || b.createdAt))
      );

      // Track running attempt counter per problem
      const problemAttemptCounter: Record<string, number> = {};
      const enrichedAll = all.map((sub) => {
        const probKey = String(sub.problemId || sub.problemSlug || sub.problemTitle || 'prob').trim().toLowerCase();
        problemAttemptCounter[probKey] = (problemAttemptCounter[probKey] || 0) + 1;
        const autoAttempt = problemAttemptCounter[probKey];

        const topicAttemptsMap = {
          ...(liveCohort?.topicAttempts || {}),
          ...topicAttemptsDraft,
        } as Record<string, number>;

        const recordedOpenAttempts = Number(
          topicAttemptsMap[sub.problemId] ||
          topicAttemptsMap[probKey] ||
          topicAttemptsMap[sub.problemSlug] ||
          0
        );

        const hasExplicitAttempt = typeof sub.attemptNumber === 'number' && sub.attemptNumber > 0;
        const attemptNum = hasExplicitAttempt
          ? sub.attemptNumber
          : recordedOpenAttempts > 0
          ? recordedOpenAttempts
          : autoAttempt;

        return {
          ...sub,
          attemptNumber: attemptNum,
        };
      });

      // Sort newest first for UI display
      enrichedAll.sort(
        (a, b) => (b.timestampMs || safeTimestampMs(b.submittedAt || b.createdAt)) - (a.timestampMs || safeTimestampMs(a.submittedAt || a.createdAt))
      );

      const tests: any[] = [];
      const practices: any[] = [];

      enrichedAll.forEach((sub) => {
        const probId = String(sub.problemId || sub.problemSlug || '').toLowerCase();
        const testTitle = String(sub.testTitle || '').toLowerCase();
        const subType = String(sub.submissionType || sub.type || '').toUpperCase();

        const isPractice =
          subType === 'PRACTICE' ||
          testTitle === 'continuous practical lab' ||
          /^(m\d+-|practice-|topic-|kanetkar-)/i.test(probId) ||
          (!sub.testId && !sub.assessmentId && subType !== 'ASSESSMENT' && subType !== 'TEST');

        if (isPractice) {
          practices.push(sub);
        } else {
          tests.push(sub);
        }
      });

      setTestSubmissions(tests);
      setPracticeSubmissions(practices);
    };

    // B. Real-time listener on assessment_test_submissions
    try {
      const uAssess = onSnapshot(
        collection(db, 'assessment_test_submissions'),
        (snap) => {
          const matched: any[] = [];
          snap.forEach((d) => {
            const data = { id: d.id, ...d.data() } as any;
            const subPrn = data.studentPrn || data.prn || '';
            const subEmail = (data.studentEmail || data.email || '').toLowerCase().trim();
            const subUid = (data.userId || data.studentId || '').trim();

            const prnMatch = FirestoreDataService.arePrnsMatching(subPrn, prn);
            const emailMatch = email && subEmail && subEmail === email.toLowerCase();
            const uidMatch = studentUid && subUid && subUid === studentUid;

            if (prnMatch || emailMatch || uidMatch) {
              matched.push(data);
            }
          });
          rawAssess = matched;
          updateCategorizedSubmissions();
        },
        () => {}
      );
      unsubs.push(uAssess);
    } catch {}

    // C. Real-time listener on general submissions (Practice / Labs)
    try {
      const uSub = onSnapshot(
        collection(db, 'submissions'),
        (snap) => {
          const matched: any[] = [];
          snap.forEach((d) => {
            const data = { id: d.id, ...d.data() } as any;
            const subPrn = data.studentPrn || data.prn || '';
            const subEmail = (data.studentEmail || data.email || '').toLowerCase().trim();
            const subUid = (data.userId || data.studentId || '').trim();

            const prnMatch = FirestoreDataService.arePrnsMatching(subPrn, prn);
            const emailMatch = email && subEmail && subEmail === email.toLowerCase();
            const uidMatch = studentUid && subUid && subUid === studentUid;

            if (prnMatch || emailMatch || uidMatch) {
              matched.push(data);
            }
          });
          rawGeneral = matched;
          updateCategorizedSubmissions();
        },
        () => {}
      );
      unsubs.push(uSub);
    } catch {}

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [prn, email, studentUid]);

  if (!student) return null;

  // 2. Aggregate telemetry & performance across cohort, live telemetry, and submissions
  const mod = liveCohort?.moduleProgress || {};

  // Problems Solved: unique problem set across assessment submissions, practice submissions, and cohort records
  const uniqueSolvedProblems = new Set<string>();
  testSubmissions.forEach((s) => {
    if (s.verdict === 'ACCEPTED' || s.academicScore > 0 || (s.testOutcomes && s.testOutcomes.some((t: any) => t.passed))) {
      uniqueSolvedProblems.add(s.problemId || s.problemTitle || s.testTitle || s.id);
    }
  });
  practiceSubmissions.forEach((s) => {
    if (s.status === 'PASSED' || s.verdict === 'ACCEPTED' || s.score > 0) {
      uniqueSolvedProblems.add(s.problemId || s.problemSlug || s.title || s.id);
    }
  });
  if (Array.isArray(liveCohort?.completedProblems)) {
    liveCohort.completedProblems.forEach((p: string) => uniqueSolvedProblems.add(p));
  }
  if (Array.isArray(student?.completedProblems)) {
    student.completedProblems.forEach((p: string) => uniqueSolvedProblems.add(p));
  }

  const problemsSolved = Math.max(
    uniqueSolvedProblems.size,
    liveCohort?.totalSolved ?? 0,
    student.problemsSolved ?? 0,
    student.solvedCount ?? 0,
    student.totalSolved ?? 0
  );

  // Academic Score / Points
  const calculatedPoints = Math.round(
    testSubmissions.reduce((acc, s) => acc + (Number(s.academicScore) || Number(s.score) || 0), 0) +
    practiceSubmissions.reduce((acc, s) => acc + (Number(s.points) || Number(s.score) || 0), 0)
  );

  const academicScore = Math.max(
    Number(mod.academicScore) || 0,
    Number(liveCohort?.totalPoints) || 0,
    calculatedPoints,
    Number(student.academicScore) || 0,
    Number(student.totalPoints) || 0,
    problemsSolved > 0 ? Math.min(100, problemsSolved * 20) : 0
  );

  // Live Proctoring signals
  const clipboardAttempts = Math.max(
    Number(mod.pasteBursts) || 0,
    Number(telemetryDraft?.copyPasteAttempts) || 0,
    Number(student.clipboardAttempts) || 0,
    Number(student.pasteBursts) || 0,
    ...testSubmissions.map((s) => Number(s.copyPasteAttempts) || 0)
  );

  const tabSwitchCount = Math.max(
    Number(mod.tabSwitches) || 0,
    Number(telemetryDraft?.tabSwitchCount) || 0,
    Number(student.tabSwitchCount) || 0,
    Number(student.tabSwitches) || 0,
    ...testSubmissions.map((s) => Number(s.tabSwitchCount) || 0)
  );

  const totalKeystrokes = Math.max(
    Number(mod.totalKeystrokes) || 0,
    Number(telemetryDraft?.totalKeystrokes) || 0,
    Number(student.totalKeystrokes) || 0,
    ...testSubmissions.map((s) => Number(s.totalKeystrokes) || 0)
  );

  const fullscreenExits = Math.max(
    Number(mod.fullscreenExits) || 0,
    Number(telemetryDraft?.fullscreenExits) || 0,
    Number(student.fullscreenExits) || 0,
    ...testSubmissions.map((s) => Number(s.fullscreenExits || s.fullScreenExitCount) || 0)
  );

  // Dynamic Integrity Score: Starts at 100%, deducts 5% per tab switch, 10% per paste burst
  const integrityScore = Math.max(
    0,
    Math.min(100, 100 - tabSwitchCount * 5 - clipboardAttempts * 10)
  );

  const cpm = Number(mod.typingVelocityCPM) || (totalKeystrokes > 0 ? Math.min(360, Math.max(90, Math.round(totalKeystrokes * 0.7))) : 0);
  const wpm = Math.round(cpm / 5);

  const isMiniProjectActive =
    liveCohort?.moduleProgress?.miniProjectUnlocked !== undefined
      ? Boolean(liveCohort.moduleProgress.miniProjectUnlocked)
      : Boolean(student.miniProjectUnlocked || student.miniProjectActive || student.isMiniProjectActive);

  const handleCopyEmail = () => {
    if (!email || email === '—') return;
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Combine and de-duplicate all student submissions for the vault
  const allSubmissions = [
    ...testSubmissions.map((s) => ({ ...s, sourceType: 'ASSESSMENT' })),
    ...practiceSubmissions
      .filter((p) => !testSubmissions.some((t) => t.id === p.id || t.problemId === p.problemId))
      .map((s) => ({ ...s, sourceType: 'PRACTICE' })),
  ];

  const [directBoundDevices, setDirectBoundDevices] = useState<string[]>([]);
  useEffect(() => {
    const targetPrn = prn !== 'N/A' ? prn : (student?.prn || student?.id);
    if (!targetPrn) return;
    DeviceSessionService.getRegisteredDevices(targetPrn).then((devs) => {
      if (Array.isArray(devs) && devs.length > 0) {
        setDirectBoundDevices(devs);
      }
    }).catch(() => {});
  }, [prn, student?.prn, student?.id]);

  const boundDevices: string[] = useMemo(() => {
    const list = new Set<string>();
    directBoundDevices.forEach((d) => d && list.add(d));
    if (Array.isArray(liveCohort?.moduleProgress?.registeredDevices)) {
      liveCohort.moduleProgress.registeredDevices.forEach((d: string) => d && list.add(d));
    }
    if (Array.isArray(liveCohort?.registeredDevices)) {
      liveCohort.registeredDevices.forEach((d: string) => d && list.add(d));
    }
    if (Array.isArray(student?.registeredDevices)) {
      student.registeredDevices.forEach((d: string) => d && list.add(d));
    }
    if (Array.isArray(telemetryDraft?.registeredDevices)) {
      telemetryDraft.registeredDevices.forEach((d: string) => d && list.add(d));
    }
    if (prn && prn !== 'N/A') {
      try {
        const localDevs = JSON.parse(localStorage.getItem(`logicq_registered_devices_${prn}`) || '[]');
        if (Array.isArray(localDevs)) {
          localDevs.forEach((d: string) => d && list.add(d));
        }
      } catch {}
    }
    return Array.from(list);
  }, [directBoundDevices, liveCohort, student, telemetryDraft, prn]);
  const [isResettingDevices, setIsResettingDevices] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleResetDevices = async () => {
    setIsResettingDevices(true);
    try {
      const ok = await DeviceSessionService.resetDeviceBindings(student.prn || student.id);
      if (ok) {
        toast.success(`Device bindings reset to 0/2 for ${studentName}`);
      } else {
        toast.error('Failed to reset device bindings');
      }
    } finally {
      setIsResettingDevices(false);
    }
  };

  const handleResetPasswordToPrn = async () => {
    const targetPrn = prn !== 'N/A' ? prn : (student.prn || student.id);
    if (!targetPrn) {
      toast.error('Student PRN not found.');
      return;
    }
    const confirmed = window.confirm(
      `Reset password for ${studentName} (${targetPrn}) back to default PRN?\n\nThis will remove any custom password and clear all bound devices so they can log in fresh using their PRN and set a new password.`
    );
    if (!confirmed) return;

    setIsResettingPassword(true);
    try {
      const ok = await FirestoreDataService.resetStudentPasswordToPrn(targetPrn, studentUid);
      if (ok) {
        toast.success(`Password reset to PRN (${targetPrn}) successfully for ${studentName}!`);
      } else {
        toast.error('Failed to reset password. Please try again.');
      }
    } catch (err: any) {
      toast.error('Error resetting password: ' + err.message);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const [isBanned, setIsBanned] = useState<boolean>(Boolean(student?.isBanned));
  const [isBanning, setIsBanning] = useState<boolean>(false);
  const [isConfirmingPurge, setIsConfirmingPurge] = useState<boolean>(false);
  const [isPurging, setIsPurging] = useState<boolean>(false);

  const handleToggleBan = async () => {
    setIsBanning(true);
    try {
      const targetPrn = prn !== 'N/A' ? prn : (student.prn || student.id);
      if (isBanned) {
        await FirestoreDataService.unbanStudent(targetPrn, studentUid);
        setIsBanned(false);
        toast.success(`Access restored: ${studentName} is now unbanned.`);
      } else {
        await FirestoreDataService.banStudent(targetPrn, studentUid, 'Violated institutional integrity policy');
        setIsBanned(true);
        toast.warning(`Account suspended: ${studentName} has been banned.`);
      }
      onStudentBanChanged?.(targetPrn, !isBanned);
    } catch (err: any) {
      toast.error('Failed to update ban status: ' + err.message);
    } finally {
      setIsBanning(false);
    }
  };

  const handleUnregisterAndPurge = async () => {
    setIsPurging(true);
    try {
      await FirestoreDataService.unregisterAndPurgeStudent({
        id: studentUid,
        prn: prn !== 'N/A' ? prn : student.prn,
        email: email !== '—' ? email : student.email,
      });
      toast.success(`Student ${studentName} has been completely vanished and unregistered from LogicQ. Zero trace remaining.`);
      onStudentPurged?.(prn !== 'N/A' ? prn : student.prn);
      onClose();
    } catch (err: any) {
      toast.error('Failed to unregister student: ' + err.message);
      setIsPurging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/65 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-[#121620] border border-slate-200/90 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto animate-in zoom-in-95">
        
        {/* ========================================================================= */}
        {/* 1. ELEGANT PROFILE HEADER                                                 */}
        {/* ========================================================================= */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-white/5 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-blue-500/20 shrink-0">
              {(studentName || 'ST').slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">
                  {studentName}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold border border-blue-500/20">
                  {sectionName}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified Identity</span>
                </span>
                {isBanned && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-500/20">
                    <AlertOctagon className="w-3.5 h-3.5" />
                    <span>ACCOUNT BANNED</span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono mt-1">
                <span>PRN: <strong className="text-slate-700 dark:text-slate-200">{prn}</strong></span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span>{email || '—'}</span>
                  {email && (
                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      className="p-0.5 hover:text-blue-500 text-slate-400 rounded transition cursor-pointer"
                      title="Copy Email"
                    >
                      {copiedEmail ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => generateIndividualStudentPdf({
                ...student,
                problemsSolved,
                academicScore,
                integrityScore,
                tabSwitchCount,
                clipboardAttempts,
              })}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
              title="Download Student Transcript PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition cursor-pointer"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Forensic Telemetry Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 pb-1">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5">
            <span className="text-[10px] text-slate-400 uppercase font-sans block">Integrity Score</span>
            <div className={`text-base font-bold font-mono mt-0.5 ${integrityScore >= 80 ? 'text-emerald-500' : integrityScore >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
              {integrityScore} / 100
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5">
            <span className="text-[10px] text-slate-400 uppercase font-sans block">Typing Speed (Rate)</span>
            <div className="text-base font-bold font-mono mt-0.5 text-amber-600 dark:text-amber-400">
              {cpm > 0 ? `${cpm} CPM` : '0 CPM'}
              <span className="text-[10px] text-slate-400 font-sans ml-1 font-normal">({wpm} WPM)</span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5">
            <span className="text-[10px] text-slate-400 uppercase font-sans block">Tab Switches</span>
            <div className={`text-base font-bold font-mono mt-0.5 ${tabSwitchCount > 0 ? 'text-amber-500' : 'text-slate-700 dark:text-slate-300'}`}>
              {tabSwitchCount} {tabSwitchCount === 1 ? 'event' : 'events'}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5">
            <span className="text-[10px] text-slate-400 uppercase font-sans block">Pastes Blocked</span>
            <div className={`text-base font-bold font-mono mt-0.5 ${clipboardAttempts > 0 ? 'text-rose-500' : 'text-slate-700 dark:text-slate-300'}`}>
              {clipboardAttempts} blocked
            </div>
          </div>
        </div>

        {/* Navigation Tabs inside Modal — 3-way vault */}
        <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-white/5 pb-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('lab_internal')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'lab_internal'
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>🔬</span>
            <span>Lab Internal</span>
            <span className="px-1.5 rounded-full text-[10px] font-mono bg-blue-500/20 text-blue-700 dark:text-blue-300">
              {testSubmissions.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('practice')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'practice'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>💻</span>
            <span>Practice Solutions</span>
            <span className="px-1.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
              {practiceSubmissions.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'bg-slate-200 dark:bg-white/10 text-slate-900 dark:text-white border border-slate-300/50 dark:border-white/10'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>⚙️</span>
            <span>Overview & Settings</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* LAB INTERNAL ASSESSMENTS TAB                                             */}
        {/* ========================================================================= */}
        {activeTab === 'lab_internal' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-bold">Lab Internal Assessments: {testSubmissions.length} Submissions</span>
              <span className="font-mono text-[11px]">Real-time Authoritative</span>
            </div>

            {testSubmissions.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 text-center space-y-2">
                <Terminal className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  No lab assessment submissions yet.
                </p>
                <p className="text-[11px] text-slate-400">
                  Once the student submits code in a Lab Internal Assessment, their C code and proctoring telemetry will appear here instantly.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {testSubmissions.map((sub, sIdx) => {
                  const subId = sub.id || `lab_${sIdx}`;
                  const isExpanded = expandedSubId === subId;
                  const isAccepted = sub.verdict === 'ACCEPTED' || sub.academicScore > 0 || (sub.testOutcomes && sub.testOutcomes.some((t: any) => t.passed));
                  const codeSnippet = sub.code || sub.submittedCode || '// No code body saved';

                  const isLate = Boolean(
                    sub.isLate ||
                    sub.lateStatus === 'LATE' ||
                    (sub.allocatedDurationMinutes && sub.timeTakenSeconds > sub.allocatedDurationMinutes * 60) ||
                    (sub.timeLimitMinutes && sub.timeTakenSeconds > sub.timeLimitMinutes * 60) ||
                    (sub.timeLimitSeconds && sub.timeTakenSeconds > sub.timeLimitSeconds)
                  );

                  return (
                    <div
                      key={subId}
                      className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] overflow-hidden transition"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedSubId(isExpanded ? null : subId)}
                        className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-100/60 dark:hover:bg-white/[0.04] transition cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-blue-500 shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {sub.problemTitle || sub.testTitle || sub.problemId || 'Lab Challenge'}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isAccepted
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              }`}>
                                {sub.verdict || (isAccepted ? 'ACCEPTED' : 'EVALUATED')}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                Attempt #{sub.attemptNumber || 1}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-500" />
                                <span>{formatTimeDuration(sub.timeTakenSeconds || sub.timeToSolveSeconds || sub.activeSeconds || sub.duration)}</span>
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                Lab Internal
                              </span>
                              {isLate && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                  LATE SUBMISSION
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5 flex-wrap">
                              <span>
                                {sub.submittedAt
                                  ? new Date(sub.submittedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                                  : 'Live Session'}
                              </span>
                              <span>•</span>
                              <span className="font-semibold text-amber-500 dark:text-amber-400 flex items-center gap-1">
                                <Clock className="w-3 h-3 inline" />
                                Solved in {formatTimeDuration(sub.timeTakenSeconds || sub.timeToSolveSeconds || sub.activeSeconds || sub.duration)}
                              </span>
                              <span>•</span>
                              <span className="text-indigo-500 dark:text-indigo-400 font-semibold">Attempt #{sub.attemptNumber || 1}</span>
                              <span>•</span>
                              {isLate ? (
                                <>
                                  <span className="text-amber-600 dark:text-amber-400 font-semibold">Marks: {sub.academicScore ?? 0.5} / {sub.maxMarks || 1.0} (Late: 0.5 Mark)</span>
                                  <span>•</span>
                                </>
                              ) : (
                                <>
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Marks: {sub.academicScore ?? sub.marksAwarded ?? 1.0} / {sub.maxMarks || 1.0}</span>
                                  <span>•</span>
                                </>
                              )}
                              <span>{sub.tabSwitchCount || 0} Tabs • {sub.copyPasteAttempts || 0} Pastes • {sub.fullscreenExits || sub.fullScreenExitCount || 0} Fullscreen Exits</span>
                            </div>
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="p-4 border-t border-slate-200/80 dark:border-white/10 bg-slate-950 text-slate-100 font-mono text-xs space-y-3">
                          {/* Marking & Late Evaluation Banner */}
                          {isLate ? (
                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                                <span><strong>Late Submission:</strong> Solved outside prescribed time. Awarded 0.5 / 1.0 mark as per time-based scoring (Section 5).</span>
                              </div>
                              <span className="font-bold font-mono text-amber-400 shrink-0 ml-2">{sub.academicScore ?? 0.5} / {sub.maxMarks || 1.0} Mark</span>
                            </div>
                          ) : (
                            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span><strong>On-Time Submission:</strong> Solved within prescribed time. Awarded full 1.0 mark (Section 5).</span>
                              </div>
                              <span className="font-bold font-mono text-emerald-400 shrink-0 ml-2">{sub.academicScore ?? sub.marksAwarded ?? 1.0} / {sub.maxMarks || 1.0} Mark</span>
                            </div>
                          )}

                          {/* Faculty Manual Marks Award / Override (Real-Time Synchronized) */}
                          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-2 text-xs">
                              <Award className="w-4 h-4 text-indigo-400 shrink-0" />
                              <span className="font-semibold text-slate-200">Faculty Marks Award:</span>
                              <span className="text-slate-400 text-[11px] font-mono">
                                (Current: {sub.academicScore ?? sub.marksAwarded ?? (isLate ? 0.5 : (sub.maxMarks || 1.0))} / {sub.maxMarks || 1.0})
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="0.5"
                                min={0}
                                max={sub.maxMarks || 1.0}
                                value={editingMarksMap[subId] !== undefined ? editingMarksMap[subId] : (sub.academicScore ?? sub.marksAwarded ?? (isLate ? 0.5 : (sub.maxMarks || 1.0)))}
                                onChange={(e) => setEditingMarksMap({ ...editingMarksMap, [subId]: Number(e.target.value) })}
                                className="w-16 px-2.5 py-1 rounded-lg bg-black/80 border border-white/20 text-white font-mono text-xs text-center focus:outline-hidden focus:border-indigo-500"
                              />
                              <span className="text-slate-400 text-xs font-mono">/ {sub.maxMarks || 1.0}</span>
                              <button
                                type="button"
                                onClick={() => handleSaveManualMarks(sub, editingMarksMap[subId] !== undefined ? editingMarksMap[subId] : (sub.academicScore ?? sub.marksAwarded ?? (isLate ? 0.5 : (sub.maxMarks || 1.0))))}
                                disabled={isSavingMarks}
                                className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <Check className="w-3 h-3" />
                                <span>Save Marks</span>
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                              GCC 14 · C Source · lab_internal.c · Submitted on Attempt #{sub.attemptNumber || 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyCode(subId, codeSnippet)}
                              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-sans flex items-center gap-1 transition cursor-pointer"
                            >
                              {copiedCodeId === subId ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy Code</span>
                                </>
                              )}
                            </button>
                          </div>

                          <pre className="p-3 bg-black/60 rounded-xl overflow-x-auto text-emerald-400 text-xs font-mono max-h-60 leading-relaxed">
                            {codeSnippet}
                          </pre>

                          {/* Proctoring mini-bar */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                            <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                              <span className="text-slate-400 block">Clipboard Pastes</span>
                              <span className={`font-bold text-sm block mt-0.5 ${(sub.copyPasteAttempts || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {sub.copyPasteAttempts || 0}
                              </span>
                            </div>
                            <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                              <span className="text-slate-400 block">Tab Switches</span>
                              <span className={`font-bold text-sm block mt-0.5 ${(sub.tabSwitchCount || 0) > 2 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {sub.tabSwitchCount || 0}
                              </span>
                            </div>
                            <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                              <span className="text-slate-400 block">Fullscreen Exits</span>
                              <span className={`font-bold text-sm block mt-0.5 ${(sub.fullscreenExits || sub.fullScreenExitCount || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {sub.fullscreenExits || sub.fullScreenExitCount || 0}
                              </span>
                            </div>
                            <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                              <span className="text-slate-400 block">Typing Speed</span>
                              <span className="font-bold text-sm text-amber-400 block mt-0.5">
                                {sub.cpm || (sub.totalKeystrokes && sub.timeTakenSeconds ? Math.round((sub.totalKeystrokes / sub.timeTakenSeconds) * 60) : sub.totalKeystrokes ? Math.min(320, Math.round(sub.totalKeystrokes * 0.7)) : 0)} CPM
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* PRACTICE SOLUTIONS TAB                                                    */}
        {/* ========================================================================= */}
        {activeTab === 'practice' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-bold">Practice Solutions: {practiceSubmissions.length} Submissions</span>
              <span className="font-mono text-[11px]">Real-time Authoritative</span>
            </div>

            {practiceSubmissions.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 text-center space-y-2">
                <Terminal className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  No practice submissions yet.
                </p>
                <p className="text-[11px] text-slate-400">
                  Once the student solves a practice problem, their submitted C code will appear here with verdict and points.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {practiceSubmissions.map((sub, sIdx) => {
                  const subId = sub.id || `prac_${sIdx}`;
                  const isExpanded = expandedSubId === subId;
                  const isAccepted = sub.verdict === 'ACCEPTED' || sub.status === 'PASSED' || sub.score > 0;
                  const codeSnippet = sub.code || sub.submittedCode || '// No code body saved';
                  const pts = sub.points || sub.score || 0;

                  return (
                    <div
                      key={subId}
                      className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] overflow-hidden transition"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedSubId(isExpanded ? null : subId)}
                        className="w-full p-3.5 flex items-center justify-between text-left hover:bg-slate-100/60 dark:hover:bg-white/[0.04] transition cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {sub.problemTitle || sub.title || sub.problemId || 'Practice Problem'}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isAccepted
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              }`}>
                                {sub.verdict || sub.status || (isAccepted ? 'ACCEPTED' : 'ATTEMPTED')}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                Attempt #{sub.attemptNumber || 1}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-500" />
                                <span>{formatTimeDuration(sub.timeTakenSeconds || sub.timeToSolveSeconds || sub.activeSeconds || sub.duration)}</span>
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                {resolvePracticeModule(sub)}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                Practice
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5 flex-wrap">
                              <span>
                                {sub.submittedAt
                                  ? new Date(sub.submittedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                                  : 'Submitted'}
                              </span>
                              <span>•</span>
                              <span className="font-semibold text-amber-500 dark:text-amber-400 flex items-center gap-1">
                                <Clock className="w-3 h-3 inline" />
                                Solved in {formatTimeDuration(sub.timeTakenSeconds || sub.timeToSolveSeconds || sub.activeSeconds || sub.duration)}
                              </span>
                              <span>•</span>
                              <span className="font-semibold text-purple-500 dark:text-purple-400">{resolvePracticeModule(sub)}</span>
                              <span>•</span>
                              <span>Attempt #{sub.attemptNumber || 1}</span>
                              <span>•</span>
                              <span>{sub.difficulty || 'EASY'}</span>
                              <span>•</span>
                              <span>{sub.tabSwitchCount || 0} Tabs</span>
                              <span>•</span>
                              <span>{sub.copyPasteAttempts || sub.pasteBursts || 0} Pastes</span>
                              <span>•</span>
                              <span>{sub.fullscreenExits || 0} Fullscreen Exits</span>
                            </div>
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="p-4 border-t border-slate-200/80 dark:border-white/10 bg-slate-950 text-slate-100 font-mono text-xs space-y-3">
                          {/* Solve Metrics & Telemetry Bar */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Solve Duration</span>
                              <span className="font-bold text-sm text-amber-400 block mt-1 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-amber-400" />
                                {formatTimeDuration(sub.timeTakenSeconds || sub.timeToSolveSeconds || sub.activeSeconds || sub.duration)}
                              </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Marks / Points</span>
                              <span className="font-bold text-sm text-emerald-400 block mt-1">
                                {sub.points || sub.academicScore || 20} / 20 pts
                              </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Proctoring Telemetry</span>
                              <span className={`font-bold text-sm block mt-1 ${(sub.tabSwitchCount || 0) > 0 || (sub.copyPasteAttempts || 0) > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                                {sub.tabSwitchCount || 0} tabs · {sub.copyPasteAttempts || sub.pasteBursts || 0} pastes
                              </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Typing Speed</span>
                              <span className="font-bold text-sm text-amber-400 block mt-1">
                                {sub.cpm || sub.typingVelocityCPM || (sub.totalKeystrokes && sub.timeTakenSeconds ? Math.round((sub.totalKeystrokes / sub.timeTakenSeconds) * 60) : 0)} CPM
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                              GCC 14 · C Source · practice_solution.c · Solved in {formatTimeDuration(sub.timeTakenSeconds || sub.timeToSolveSeconds || sub.activeSeconds || sub.duration)} (Attempt #{sub.attemptNumber || 1})
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyCode(subId, codeSnippet)}
                              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-sans flex items-center gap-1 transition cursor-pointer"
                            >
                              {copiedCodeId === subId ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy Code</span>
                                </>
                              )}
                            </button>
                          </div>

                          <pre className="p-3 bg-black/60 rounded-xl overflow-x-auto text-emerald-400 text-xs font-mono max-h-60 leading-relaxed">
                            {codeSnippet}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-3">
            {/* ========================================================================= */}
            {/* HARDWARE DEVICE BINDING CARD                                               */}
            {/* ========================================================================= */}
            <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-blue-500" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Hardware Device Authorization
                  </h4>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                    boundDevices.length >= 2
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  }`}>
                    {boundDevices.length} / 2 Devices Bound
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Max 2 physical devices allowed (Laptop &amp; Mobile). Reset to let student bind new devices or recover lost access.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={handleResetDevices}
                  disabled={isResettingDevices || boundDevices.length === 0}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-200/80 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 transition active:scale-95 cursor-pointer shrink-0 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isResettingDevices ? 'animate-spin' : ''}`} />
                  <span>Reset Devices</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetPasswordToPrn}
                  disabled={isResettingPassword}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 transition active:scale-95 cursor-pointer shrink-0 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <KeyRound className={`w-3.5 h-3.5 ${isResettingPassword ? 'animate-spin' : ''}`} />
                  <span>Reset Password to PRN</span>
                </button>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* BAN / UNREGISTER CARD                                                      */}
            {/* ========================================================================= */}
            <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-500" />
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Account Security &amp; Moderation
                  </h4>
                  {isBanned && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                      BANNED
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Suspend student login access or completely purge and unregister this account with zero trace.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleToggleBan}
                  disabled={isBanning}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50 ${
                    isBanned
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  }`}
                >
                  <Ban className={`w-3.5 h-3.5 ${isBanning ? 'animate-spin' : ''}`} />
                  <span>{isBanned ? 'Unban Student' : 'Ban Student'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingPurge(true)}
                  disabled={isPurging}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Unregister &amp; Purge</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Unregister Confirmation Dialog */}
      {isConfirmingPurge && (
        <div className="fixed inset-0 z-[10000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#151a26] border border-rose-500/30 rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Completely Unregister &amp; Purge Student?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                This will permanently delete <strong>{studentName}</strong> ({prn}) and vanish all submissions, test records, drafts, and device bindings from the platform. <strong>Zero trace will remain.</strong>
              </p>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-700 dark:text-amber-300 text-left">
                ℹ️ If this student ever wishes to return, they will need to register anew from scratch using the section join link.
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmingPurge(false)}
                disabled={isPurging}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/10 hover:bg-slate-200 text-slate-700 dark:text-slate-300 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUnregisterAndPurge}
                disabled={isPurging}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isPurging ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Vanishing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Vanish Student</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
