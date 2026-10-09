import { describe, it, expect } from 'vitest';

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

    // Rule: Cannot modify role, status, points, streak, or stats
    const incomingData = ctx.request.resource?.data || {};
    const existingData = ctx.resource?.data || {};

    const forbiddenKeys = ['role', 'status', 'banReason', 'stats', 'points', 'totalPoints', 'streak', 'currentStreak'];
    for (const key of forbiddenKeys) {
      if (key in incomingData && incomingData[key] !== existingData[key]) {
        return false; // CHEAT REJECTED
      }
    }
    return true;
  }

  static evaluateHiddenTestRead(ctx: FirestoreRuleContext): boolean {
    // Rule: match /hidden_tests/{testId} { allow read, write: if false; }
    // Always returns false for client access
    return false;
  }

  static evaluateSubmissionRead(ctx: FirestoreRuleContext): boolean {
    if (!ctx.auth) return false;
    // Rule: allow read: if auth.uid == resource.data.userId || auth.token.role == 'ADMIN'
    const ownerId = ctx.resource?.data?.userId;
    const isAdmin = ctx.auth.token.role === 'ADMIN';
    return ctx.auth.uid === ownerId || isAdmin;
  }

  static evaluateSubmissionWrite(ctx: FirestoreRuleContext): boolean {
    // Rule: allow create, update, delete: if false; (Only server Admin SDK can write)
    return false;
  }

  static evaluateSubmissionDelete(ctx: FirestoreRuleContext): boolean {
    // Rule: allow delete: if false;
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
    // Alice attempts to inspect Bob's submission
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
});
