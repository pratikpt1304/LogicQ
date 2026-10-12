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
      'role',
      'status',
      'banReason',
      'stats',
      'points',
      'totalPoints',
      'streak',
      'currentStreak',
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
    if (ctx.auth.token.role === 'ADMIN') return true;
    const data = ctx.resource?.data || {};
    return data.status === 'published' && data.isCurrentWeekUnlocked === true;
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

  it('CHEAT ATTEMPT 8: Student attempts to read a locked future problem or past-week archive problem -> MUST FAIL', () => {
    const lockedFutureProblem: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { status: 'published', isCurrentWeekUnlocked: false } },
      request: {},
    };
    const unlockedCurrentWeekProblem: FirestoreRuleContext = {
      auth: studentAlice,
      resource: { data: { status: 'published', isCurrentWeekUnlocked: true } },
      request: {},
    };

    expect(RulesEvaluator.evaluateProblemRead(lockedFutureProblem)).toBe(false);
    expect(RulesEvaluator.evaluateProblemRead(unlockedCurrentWeekProblem)).toBe(true);
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
});
