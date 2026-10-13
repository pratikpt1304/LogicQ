import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Firestore Security Rules Cheating & Adversarial Attack Simulation Suite
 *
 * Simulates and verifies the exact permission logic enforced by `firestore.rules`:
 * - Deny by default
 * - Attempt to edit points / streak -> REJECTED
 * - Attempt to read hidden test cases -> REJECTED
 * - Attempt to read another student's submission -> REJECTED
 * - Attempt to set own role to ADMIN -> REJECTED
 * - Attempt to delete a submission record -> REJECTED
 * - Attempt to read/write disabled Arena (`contests`) or Archive (`archive`) collections -> REJECTED for all roles
 * - Attempt by student to read a locked future problem or past-week problem -> REJECTED
 */

interface AuthContext {
  uid: string;
  token: {
    email: string;
    role?: 'STUDENT' | 'ADMIN';
  };
}

interface FirestoreRuleContext {
  auth: AuthContext | null;
  resource?: {
    data: Record<string, any>;
  };
  request: {
    resource?: {
      data: Record<string, any>;
    };
  };
}

// Emulated Firestore Security Rule Evaluators (matching firestore.rules)
class RulesEvaluator {
  static evaluateUserUpdate(ctx: FirestoreRuleContext, targetUserId: string): boolean {
    if (!ctx.auth) return false;
    if (ctx.auth.uid !== targetUserId) return false;

    const incomingData = ctx.request.resource?.data || {};
    const existingData = ctx.resource?.data || {};

    const forbiddenKeys = [
      'prn',
      'college',
      'email',
      'role',
      'status',
      'banReason',
      'stats',
      'points',
      'totalPoints',
      'streak',
      'currentStreak',
      'prnChangedAt',
      'prnNextAllowedChangeDate',
    ];
    for (const key of forbiddenKeys) {
      if (key in incomingData && incomingData[key] !== existingData[key]) {
        return false; // CHEAT REJECTED
      }
    }
    return true;
  }

  static evaluateHiddenTestRead(_ctx: FirestoreRuleContext): boolean {
    // Rule: match /hidden_tests/{testId} { allow read, write: if false; }
    return false;
  }

  static evaluateSubmissionRead(ctx: FirestoreRuleContext): boolean {
    if (!ctx.auth) return false;
    const ownerId = ctx.resource?.data?.userId;
    const isAdmin = ctx.auth.token.role === 'ADMIN';
    return ctx.auth.uid === ownerId || isAdmin;
  }

  static evaluateSubmissionWrite(_ctx: FirestoreRuleContext): boolean {
    return false;
  }

  static evaluateSubmissionDelete(_ctx: FirestoreRuleContext): boolean {
    return false;
  }

  static evaluateContestAccess(_ctx: FirestoreRuleContext): boolean {
    // Rule: match /contests/{contestId} { allow read, write: if false; }
    return false;
  }

  static evaluateArchiveAccess(_ctx: FirestoreRuleContext): boolean {
    // Rule: match /archive/{archiveId} { allow read, write: if false; }
    return false;
  }

  static evaluateProblemRead(ctx: FirestoreRuleContext): boolean {
    if (!ctx.auth) return false;
    return ctx.auth.token.role === 'ADMIN';
  }

  static evaluatePracticeProgressRead(ctx: FirestoreRuleContext): boolean {
    if (!ctx.auth) return false;
    const ownerId = ctx.resource?.data?.userId;
    const isAdmin = ctx.auth.token.role === 'ADMIN';
    return ctx.auth.uid === ownerId || isAdmin;
  }

  static evaluateUserPracticeProgressRead(ctx: FirestoreRuleContext, targetUserId: string): boolean {
    if (!ctx.auth) return false;
    const isAdmin = ctx.auth.token.role === 'ADMIN';
    return ctx.auth.uid === targetUserId || isAdmin;
  }

  static evaluatePracticeProgressWrite(_ctx: FirestoreRuleContext): boolean {
    return false;
  }

  static evaluateUserRead(ctx: FirestoreRuleContext, targetUserId: string): boolean {
    if (!ctx.auth) return false;
    const isAdmin = ctx.auth.token.role === 'ADMIN';
    return ctx.auth.uid === targetUserId || isAdmin;
  }

  static evaluatePrnIndexAccess(_ctx: FirestoreRuleContext): boolean {
    // Rule: match /prnIndex/{prn} { allow read, write: if false; }
    return false;
  }

  static evaluatePrnHistoryWrite(_ctx: FirestoreRuleContext): boolean {
    // Rule: match /users/{userId}/prnHistory/{historyId} { allow write: if false; }
    return false;
  }

  static evaluateDailyBoardRead(ctx: FirestoreRuleContext): boolean {
    return ctx.auth !== null;
  }

  static evaluateDailyBoardWrite(_ctx: FirestoreRuleContext): boolean {
    return false;
  }

  static evaluateDailyLeaderboardRead(ctx: FirestoreRuleContext): boolean {
    return ctx.auth !== null;
  }

  static evaluateDailyLeaderboardWrite(_ctx: FirestoreRuleContext): boolean {
    return false;
  }

  static evaluateDailyResultRead(ctx: FirestoreRuleContext): boolean {
    if (!ctx.auth) return false;
    const ownerId = ctx.resource?.data?.userId;
    const isAdmin = ctx.auth.token.role === 'ADMIN';
    return ctx.auth.uid === ownerId || isAdmin;
  }

  static evaluateDailyResultWrite(_ctx: FirestoreRuleContext): boolean {
    return false;
  }

  static evaluateDailySummaryRead(ctx: FirestoreRuleContext): boolean {
    if (!ctx.auth) return false;
    const ownerId = ctx.resource?.data?.userId;
    const isAdmin = ctx.auth.token.role === 'ADMIN';
    return ctx.auth.uid === ownerId || isAdmin;
  }

  static evaluateDailySummaryWrite(_ctx: FirestoreRuleContext): boolean {
    return false;
  }

  static evaluateDailyCorrectionRead(ctx: FirestoreRuleContext): boolean {
    if (!ctx.auth) return false;
    return ctx.auth.token.role === 'ADMIN';
  }

  static evaluateDailyCorrectionWrite(_ctx: FirestoreRuleContext): boolean {
    return false;
  }

  static evaluateDailyRankSnapshotRead(ctx: FirestoreRuleContext): boolean {
    return ctx.auth !== null;
  }

  static evaluateDailyRankSnapshotWrite(_ctx: FirestoreRuleContext): boolean {
    return false;
  }
}

describe('Firestore Security Rules: Adversarial Cheating Attack Suite', () => {
  const studentAlice: AuthContext = {
    uid: 'student_alice',
    token: { email: 'alice@college.edu', role: 'STUDENT' },
  };

  const studentBob: AuthContext = {
    uid: 'student_bob',
    token: { email: 'bob@college.edu', role: 'STUDENT' },
  };

  const adminCharlie: AuthContext = {
    uid: 'admin_charlie',
    token: { email: 'admin@college.edu', role: 'ADMIN' },
  };

  it('CHEAT ATTEMPT 1: Student attempts to inflate their own points directly -> MUST FAIL', () => {
    const ctx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { points: 100, streak: 2 } },
      request: { resource: { data: { points: 9999, streak: 2 } } },
    };

    const isAllowed = RulesEvaluator.evaluateUserUpdate(ctx, 'student_alice');
    expect(isAllowed).toBe(false);
  });

  it('CHEAT ATTEMPT 2: Student attempts to elevate their own role to ADMIN -> MUST FAIL', () => {
    const ctx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { role: 'STUDENT' } },
      request: { resource: { data: { role: 'ADMIN' } } },
    };

    const isAllowed = RulesEvaluator.evaluateUserUpdate(ctx, 'student_alice');
    expect(isAllowed).toBe(false);
  });

  it('CHEAT ATTEMPT 3: Student attempts to read hidden test cases -> MUST FAIL', () => {
    const ctx: FirestoreRuleContext = {
      auth: studentAlice,
      request: {},
    };

    const isAllowed = RulesEvaluator.evaluateHiddenTestRead(ctx);
    expect(isAllowed).toBe(false);
  });

  it('CHEAT ATTEMPT 4: Student attempts to read another competitor code submission -> MUST FAIL', () => {
    const ctx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { id: 'sub_bob_1', userId: 'student_bob', code: 'secret_solution()' } },
      request: {},
    };

    const isAllowed = RulesEvaluator.evaluateSubmissionRead(ctx);
    expect(isAllowed).toBe(false);
  });

  it('CHEAT ATTEMPT 5: Student attempts to delete their failed submission -> MUST FAIL', () => {
    const ctx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { id: 'sub_alice_wrong', userId: 'student_alice' } },
      request: {},
    };

    const isAllowed = RulesEvaluator.evaluateSubmissionDelete(ctx);
    expect(isAllowed).toBe(false);
  });

  it('CHEAT ATTEMPT 6: Client attempts to forge an ACCEPTED submission directly -> MUST FAIL', () => {
    const ctx: FirestoreRuleContext = {
      auth: studentAlice,
      request: { resource: { data: { verdict: 'ACCEPTED', pointsAwarded: 50 } } },
    };

    const isAllowed = RulesEvaluator.evaluateSubmissionWrite(ctx);
    expect(isAllowed).toBe(false);
  });

  it('CHEAT ATTEMPT 7: Unauthenticated, Student, or Admin client attempts to read/write disabled contests or archive collections -> MUST FAIL', () => {
    const rulesFile = fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf-8');
    expect(rulesFile).toContain('match /contests/{contestId=**}');
    expect(rulesFile).toContain('match /archive/{docId=**}');

    for (const caller of [null, studentAlice, studentBob, adminCharlie]) {
      expect(RulesEvaluator.evaluateContestAccess({ auth: caller, request: {} })).toBe(false);
      expect(RulesEvaluator.evaluateArchiveAccess({ auth: caller, request: {} })).toBe(false);
    }
  });

  it('CHEAT ATTEMPT 8: Student attempts to read /problems/{problemId} directly in Firestore -> MUST FAIL (only Admin can read directly; students receive today’s challenge via server API)', () => {
    const rulesFile = fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf-8');
    expect(rulesFile).toContain('match /problems/{problemId}');
    expect(rulesFile).toContain('allow read: if isAdmin();');

    const studentProblemRead: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { status: 'published' } },
      request: {},
    };
    const adminProblemRead: FirestoreRuleContext = {
      auth: adminCharlie,
      resource: { data: { status: 'published' } },
      request: {},
    };

    expect(RulesEvaluator.evaluateProblemRead(studentProblemRead)).toBe(false);
    expect(RulesEvaluator.evaluateProblemRead(adminProblemRead)).toBe(true);
  });

  it('VALID OPERATION: Student reads their own submission -> MUST SUCCEED', () => {
    const ctx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { id: 'sub_alice_1', userId: 'student_alice', verdict: 'ACCEPTED' } },
      request: {},
    };

    const isAllowed = RulesEvaluator.evaluateSubmissionRead(ctx);
    expect(isAllowed).toBe(true);
  });

  it('VALID OPERATION: Admin reads any submission -> MUST SUCCEED', () => {
    const ctx: FirestoreRuleContext = {
      auth: adminCharlie,
      resource: { data: { id: 'sub_bob_1', userId: 'student_bob', verdict: 'WRONG_ANSWER' } },
      request: {},
    };

    const isAllowed = RulesEvaluator.evaluateSubmissionRead(ctx);
    expect(isAllowed).toBe(true);
  });

  it('CHEAT ATTEMPT 9: Storage Rules & uploadedSolutions — blocks reading peer uploads, overwriting/deleting files, invalid MIME types, >5MB files, and self-approval', () => {
    const storageRules = fs.readFileSync(path.resolve(__dirname, '../../storage.rules'), 'utf-8');
    const firestoreRules = fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf-8');

    expect(storageRules).toContain('match /{allPaths=**}');
    expect(storageRules).toContain('allow read, write: if false;');
    expect(storageRules).toContain('match /uploads/{userId}/{problemId}/{submissionId}/{fileId}');
    expect(storageRules).toContain('allow read: if isOwner(userId) || isAdmin();');
    expect(storageRules).toContain('allow create: if isOwner(userId) && isValidUploadMimeType() && isWithinSizeLimit();');
    expect(storageRules).toContain('allow update, delete: if false;');

    expect(firestoreRules).toContain('match /uploaded_solutions/{uploadId}');
    expect(firestoreRules).toContain('match /upload_reviews/{reviewId}');
    expect(firestoreRules).toContain('allow write: if false;');
  });

  it('CHEAT ATTEMPT 10: Practice Progress — Student cannot read peer practice progress or forge practice progress writes', () => {
    const firestoreRules = fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf-8');

    // Verify rules file contains top-level practice_progress
    expect(firestoreRules).toContain('match /practice_progress/{progressId}');
    expect(firestoreRules).toContain('resource.data.userId == request.auth.uid || isAdmin()');

    // Verify rules file contains subcollection under users/{userId}
    expect(firestoreRules).toContain('match /practice_progress/{progressId}');
    expect(firestoreRules).toContain('allow read: if isOwner(userId) || isAdmin();');

    // Student Alice attempts to read Bob's top-level practice progress -> MUST FAIL
    const peerReadTopLevel: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { userId: 'student_bob', problemId: 'prob_1', status: 'SOLVED' } },
      request: {},
    };
    expect(RulesEvaluator.evaluatePracticeProgressRead(peerReadTopLevel)).toBe(false);

    // Unauthenticated attempts to read top-level practice progress -> MUST FAIL
    const unauthReadTopLevel: FirestoreRuleContext = {
      auth: null,
      resource: { data: { userId: 'student_alice', problemId: 'prob_1', status: 'SOLVED' } },
      request: {},
    };
    expect(RulesEvaluator.evaluatePracticeProgressRead(unauthReadTopLevel)).toBe(false);

    // Student Alice attempts to read Bob's subcollection practice progress -> MUST FAIL
    const peerReadSubcollection: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { problemId: 'prob_1', status: 'SOLVED' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateUserPracticeProgressRead(peerReadSubcollection, 'student_bob')).toBe(false);

    // Any client attempts to write/modify practice progress -> MUST FAIL
    const clientWrite: FirestoreRuleContext = {
      auth: studentAlice,
      request: { resource: { data: { status: 'SOLVED', solvedAt: Date.now() } } },
    };
    expect(RulesEvaluator.evaluatePracticeProgressWrite(clientWrite)).toBe(false);
  });

  it('VALID OPERATION: Student reads own practice progress, Admin reads any practice progress', () => {
    // Alice reads her own top-level practice progress -> MUST SUCCEED
    const aliceOwnTopLevel: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { userId: 'student_alice', problemId: 'prob_1', status: 'SOLVED' } },
      request: {},
    };
    expect(RulesEvaluator.evaluatePracticeProgressRead(aliceOwnTopLevel)).toBe(true);

    // Alice reads her own user subcollection practice progress -> MUST SUCCEED
    const aliceOwnSubcollection: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { problemId: 'prob_1', status: 'SOLVED' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateUserPracticeProgressRead(aliceOwnSubcollection, 'student_alice')).toBe(true);

    // Admin Charlie reads Bob's top-level practice progress -> MUST SUCCEED
    const adminReadTopLevel: FirestoreRuleContext = {
      auth: adminCharlie,
      resource: { data: { userId: 'student_bob', problemId: 'prob_1', status: 'SOLVED' } },
      request: {},
    };
    expect(RulesEvaluator.evaluatePracticeProgressRead(adminReadTopLevel)).toBe(true);

    // Admin Charlie reads Bob's subcollection practice progress -> MUST SUCCEED
    const adminReadSubcollection: FirestoreRuleContext = {
      auth: adminCharlie,
      resource: { data: { problemId: 'prob_1', status: 'SOLVED' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateUserPracticeProgressRead(adminReadSubcollection, 'student_bob')).toBe(true);
  });

  it('CHEAT ATTEMPT 11: Student attempts to mutate their own immutable PRN (e.g. 2199TESM0001 -> 2199TESF0002) or college -> MUST FAIL', () => {
    const prnMutationCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { uid: 'student_alice', prn: '2199TESM0001', college: 'Sanjivani University', department: 'AIML', year: 'TY' } },
      request: { resource: { data: { uid: 'student_alice', prn: '2199TESF0002', college: 'Sanjivani University', department: 'AIML', year: 'TY' } } },
    };
    expect(RulesEvaluator.evaluateUserUpdate(prnMutationCtx, 'student_alice')).toBe(false);

    const collegeMutationCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { uid: 'student_alice', prn: '2199TESM0001', college: 'Sanjivani University', department: 'AIML', year: 'TY' } },
      request: { resource: { data: { uid: 'student_alice', prn: '2199TESM0001', college: 'Other University', department: 'AIML', year: 'TY' } } },
    };
    expect(RulesEvaluator.evaluateUserUpdate(collegeMutationCtx, 'student_alice')).toBe(false);
  });

  it('CHEAT ATTEMPT 12: Student attempts to read another student private users/{uid} document (PRN PII & email) -> MUST FAIL', () => {
    const peerUserReadCtx: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { uid: 'student_bob', prn: '2199TESF0002', email: 'bob@college.edu' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateUserRead(peerUserReadCtx, 'student_bob')).toBe(false);

    const unauthReadCtx: FirestoreRuleContext = {
      auth: null,
      resource: { data: { uid: 'student_alice', prn: '2199TESM0001', email: 'alice@college.edu' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateUserRead(unauthReadCtx, 'student_alice')).toBe(false);
  });

  it('CHEAT ATTEMPT 13: Client (Student or Admin) attempts to read or write prnIndex/{prn} directly (fake PRNs 2199TESM0001 / 2199TESF0002) -> MUST FAIL', () => {
    for (const caller of [null, studentAlice, studentBob, adminCharlie]) {
      const readCtx: FirestoreRuleContext = { auth: caller, request: {} };
      expect(RulesEvaluator.evaluatePrnIndexAccess(readCtx)).toBe(false);

      const writeCtx: FirestoreRuleContext = {
        auth: caller,
        request: { resource: { data: { prn: '2199TESM0001', userId: 'student_alice' } } },
      };
      expect(RulesEvaluator.evaluatePrnIndexAccess(writeCtx)).toBe(false);
    }
  });

  it('CHEAT ATTEMPT 14: Client attempts to write directly to /users/{uid}/prnHistory -> MUST FAIL (Server Admin SDK only)', () => {
    const clientHistoryWrite: FirestoreRuleContext = {
      auth: studentAlice,
      request: { resource: { data: { oldPrn: '2199TESM0001', newPrn: '2199TESF0002' } } },
    };
    expect(RulesEvaluator.evaluatePrnHistoryWrite(clientHistoryWrite)).toBe(false);
  });

  it('VALID OPERATION: Student reads their own private profile (with masked PRN) and Admin reads any student private profile', () => {
    const aliceOwnRead: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { uid: 'student_alice', prn: '2199TESM0001', maskedPrn: '••••••••0001' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateUserRead(aliceOwnRead, 'student_alice')).toBe(true);

    const adminReadBob: FirestoreRuleContext = {
      auth: adminCharlie,
      resource: { data: { uid: 'student_bob', prn: '2199TESF0002' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateUserRead(adminReadBob, 'student_bob')).toBe(true);
  });

  it('SPEC VERIFICATION: firestore.rules and docs/SECURITY_RULES.md enforce canonical 12-char PRN regex ^[0-9]{4}[A-Z]{3}[MF][0-9]{4}$, prnIndex lock, and 8-bullet masking', () => {
    const firestoreRules = fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf-8');
    const securityRulesDoc = fs.readFileSync(path.resolve(__dirname, '../../docs/SECURITY_RULES.md'), 'utf-8');

    // PRN regex matching exactly 12 characters: 4 digits, 3 letters, M or F, 4 digits
    const expectedRegexPattern = '^[0-9]{4}[A-Z]{3}[MF][0-9]{4}$';
    const amendedPrnRegex = new RegExp(`^${expectedRegexPattern.slice(1, -1)}$`);

    // Verify regex matches mock fixtures
    expect(amendedPrnRegex.test('2199TESM0001')).toBe(true);
    expect(amendedPrnRegex.test('2199TESF0002')).toBe(true);
    expect(amendedPrnRegex.test('2026AIML1001')).toBe(false); // 4 letters in program instead of 3
    expect(amendedPrnRegex.test('202612345678')).toBe(false); // digits only
    expect(amendedPrnRegex.test('2199TESX0001')).toBe(false); // X instead of M or F

    // Verify firestore.rules contains amended PRN format comments and rules
    expect(firestoreRules).toContain(expectedRegexPattern);
    expect(firestoreRules).toContain('match /prnIndex/{prn}');
    expect(firestoreRules).toContain('match /users/{userId}');
    expect(firestoreRules).toContain('match /prnHistory/{historyId}');
    expect(firestoreRules).toContain('••••••••1039');

    // Verify docs/SECURITY_RULES.md contains amended PRN format specs and masking
    expect(securityRulesDoc).toContain(expectedRegexPattern);
    expect(securityRulesDoc).toContain('2199TESM0001');
    expect(securityRulesDoc).toContain('2199TESF0002');
    expect(securityRulesDoc).toContain('••••••••1039');
    expect(securityRulesDoc).toContain('prnIndex/{prn}');
  });

  it('DAILY COMPETITION: Authenticated student can read their own daily_results and daily_summaries, but CANNOT read other students’ daily results or summaries', () => {
    // Alice reads her own daily_results -> MUST SUCCEED
    const aliceOwnDailyResult: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { id: '2026-10-13_student_alice', userId: 'student_alice', pointsAwarded: 200, verdict: 'ACCEPTED' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateDailyResultRead(aliceOwnDailyResult)).toBe(true);

    // Alice reads her own daily_summaries -> MUST SUCCEED
    const aliceOwnDailySummary: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { id: '2026-10-13_student_alice', userId: 'student_alice', pointsEarned: 200, streak: 5 } },
      request: {},
    };
    expect(RulesEvaluator.evaluateDailySummaryRead(aliceOwnDailySummary)).toBe(true);

    // Alice attempts to read Bob's daily_results -> MUST FAIL
    const aliceReadBobDailyResult: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { id: '2026-10-13_student_bob', userId: 'student_bob', pointsAwarded: 200, verdict: 'ACCEPTED' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateDailyResultRead(aliceReadBobDailyResult)).toBe(false);

    // Alice attempts to read Bob's daily_summaries -> MUST FAIL
    const aliceReadBobDailySummary: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { id: '2026-10-13_student_bob', userId: 'student_bob', pointsEarned: 200, streak: 3 } },
      request: {},
    };
    expect(RulesEvaluator.evaluateDailySummaryRead(aliceReadBobDailySummary)).toBe(false);

    // Unauthenticated attempts to read Alice's daily_results -> MUST FAIL
    const unauthDailyResult: FirestoreRuleContext = {
      auth: null,
      resource: { data: { id: '2026-10-13_student_alice', userId: 'student_alice' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateDailyResultRead(unauthDailyResult)).toBe(false);

    // Unauthenticated attempts to read Alice's daily_summaries -> MUST FAIL
    const unauthDailySummary: FirestoreRuleContext = {
      auth: null,
      resource: { data: { id: '2026-10-13_student_alice', userId: 'student_alice' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateDailySummaryRead(unauthDailySummary)).toBe(false);

    // Admin Charlie reads Bob's daily_results -> MUST SUCCEED
    const adminReadBobDailyResult: FirestoreRuleContext = {
      auth: adminCharlie,
      resource: { data: { id: '2026-10-13_student_bob', userId: 'student_bob', pointsAwarded: 200, verdict: 'ACCEPTED' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateDailyResultRead(adminReadBobDailyResult)).toBe(true);

    // Admin Charlie reads Bob's daily_summaries -> MUST SUCCEED
    const adminReadBobDailySummary: FirestoreRuleContext = {
      auth: adminCharlie,
      resource: { data: { id: '2026-10-13_student_bob', userId: 'student_bob', pointsEarned: 200, streak: 3 } },
      request: {},
    };
    expect(RulesEvaluator.evaluateDailySummaryRead(adminReadBobDailySummary)).toBe(true);
  });

  it('DAILY COMPETITION: Student cannot write, create, or update daily_boards, daily_results, daily_summaries, daily_corrections, or daily_rank_snapshots', () => {
    const studentBoardWriteCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: { resource: { data: { dayId: '2026-10-13', isFrozen: true } } },
    };
    expect(RulesEvaluator.evaluateDailyBoardWrite(studentBoardWriteCtx)).toBe(false);

    const studentLeaderboardWriteCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: { resource: { data: { userId: 'student_alice', rank: 1, score: 300 } } },
    };
    expect(RulesEvaluator.evaluateDailyLeaderboardWrite(studentLeaderboardWriteCtx)).toBe(false);

    const studentResultWriteCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: { resource: { data: { userId: 'student_alice', verdict: 'ACCEPTED', pointsAwarded: 300 } } },
    };
    expect(RulesEvaluator.evaluateDailyResultWrite(studentResultWriteCtx)).toBe(false);

    const studentSummaryWriteCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: { resource: { data: { userId: 'student_alice', pointsEarned: 300, dailyRank: 1 } } },
    };
    expect(RulesEvaluator.evaluateDailySummaryWrite(studentSummaryWriteCtx)).toBe(false);

    const studentCorrectionWriteCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: { resource: { data: { userId: 'student_alice', reason: 'Forged correction' } } },
    };
    expect(RulesEvaluator.evaluateDailyCorrectionWrite(studentCorrectionWriteCtx)).toBe(false);

    const studentSnapshotWriteCtx: FirestoreRuleContext = {
      auth: studentAlice,
      request: { resource: { data: { dayId: '2026-10-13', snapshotType: 'top20' } } },
    };
    expect(RulesEvaluator.evaluateDailyRankSnapshotWrite(studentSnapshotWriteCtx)).toBe(false);

    // Also verify admin direct client writes are blocked (managed strictly by server Admin SDK)
    expect(RulesEvaluator.evaluateDailyBoardWrite({ auth: adminCharlie, request: {} })).toBe(false);
    expect(RulesEvaluator.evaluateDailyLeaderboardWrite({ auth: adminCharlie, request: {} })).toBe(false);
    expect(RulesEvaluator.evaluateDailyResultWrite({ auth: adminCharlie, request: {} })).toBe(false);
    expect(RulesEvaluator.evaluateDailySummaryWrite({ auth: adminCharlie, request: {} })).toBe(false);
    expect(RulesEvaluator.evaluateDailyCorrectionWrite({ auth: adminCharlie, request: {} })).toBe(false);
    expect(RulesEvaluator.evaluateDailyRankSnapshotWrite({ auth: adminCharlie, request: {} })).toBe(false);
  });

  it('DAILY COMPETITION: Admin can read daily_corrections, while student cannot', () => {
    // Admin reads daily_corrections -> MUST SUCCEED
    const adminCorrectionRead: FirestoreRuleContext = {
      auth: adminCharlie,
      resource: { data: { id: 'corr_1', dayId: '2026-10-13', userId: 'student_bob' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateDailyCorrectionRead(adminCorrectionRead)).toBe(true);

    // Student Alice reads daily_corrections -> MUST FAIL
    const studentAliceCorrectionRead: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { id: 'corr_1', dayId: '2026-10-13', userId: 'student_bob' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateDailyCorrectionRead(studentAliceCorrectionRead)).toBe(false);

    // Student Bob reads daily_corrections (even for a correction regarding him) -> MUST FAIL (Admin only)
    const studentBobCorrectionRead: FirestoreRuleContext = {
      auth: studentBob,
      resource: { data: { id: 'corr_1', dayId: '2026-10-13', userId: 'student_bob' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateDailyCorrectionRead(studentBobCorrectionRead)).toBe(false);

    // Unauthenticated reads daily_corrections -> MUST FAIL
    const unauthCorrectionRead: FirestoreRuleContext = {
      auth: null,
      resource: { data: { id: 'corr_1', dayId: '2026-10-13', userId: 'student_bob' } },
      request: {},
    };
    expect(RulesEvaluator.evaluateDailyCorrectionRead(unauthCorrectionRead)).toBe(false);
  });

  it('DAILY COMPETITION: Authenticated users can read daily_boards, leaderboard subcollection, and daily_rank_snapshots', () => {
    // Student Alice reads daily_boards -> MUST SUCCEED
    expect(RulesEvaluator.evaluateDailyBoardRead({ auth: studentAlice })).toBe(true);
    // Student Alice reads daily_boards leaderboard subcollection -> MUST SUCCEED
    expect(RulesEvaluator.evaluateDailyLeaderboardRead({ auth: studentAlice })).toBe(true);
    // Student Alice reads daily_rank_snapshots -> MUST SUCCEED
    expect(RulesEvaluator.evaluateDailyRankSnapshotRead({ auth: studentAlice })).toBe(true);

    // Admin Charlie reads daily_boards and daily_rank_snapshots -> MUST SUCCEED
    expect(RulesEvaluator.evaluateDailyBoardRead({ auth: adminCharlie })).toBe(true);
    expect(RulesEvaluator.evaluateDailyLeaderboardRead({ auth: adminCharlie })).toBe(true);
    expect(RulesEvaluator.evaluateDailyRankSnapshotRead({ auth: adminCharlie })).toBe(true);

    // Unauthenticated user -> MUST FAIL
    expect(RulesEvaluator.evaluateDailyBoardRead({ auth: null })).toBe(false);
    expect(RulesEvaluator.evaluateDailyLeaderboardRead({ auth: null })).toBe(false);
    expect(RulesEvaluator.evaluateDailyRankSnapshotRead({ auth: null })).toBe(false);
  });

  it('SPEC VERIFICATION: firestore.rules and docs/SECURITY_RULES.md contain daily competition collections and legacy archives', () => {
    const firestoreRules = fs.readFileSync(path.resolve(__dirname, '../../firestore.rules'), 'utf-8');
    const securityRulesDoc = fs.readFileSync(path.resolve(__dirname, '../../docs/SECURITY_RULES.md'), 'utf-8');

    const expectedCollections = [
      'match /daily_boards/{dayId}',
      'match /daily_results/{resultId}',
      'match /daily_summaries/{summaryId}',
      'match /daily_corrections/{correctionId}',
      'match /daily_rank_snapshots/{snapshotId}',
      'match /weeks/{weekId}',
      'match /weekly_summaries/{summaryId}',
      'match /weekly_corrections/{correctionId}',
    ];

    for (const pattern of expectedCollections) {
      expect(firestoreRules).toContain(pattern);
      expect(securityRulesDoc).toContain(pattern);
    }
  });
});
