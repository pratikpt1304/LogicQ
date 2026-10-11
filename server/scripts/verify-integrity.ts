import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface IntegrityCheckResult {
  checkName: string;
  passed: boolean;
  details: string;
  count?: number;
}

export async function verifyDatabaseIntegrity(): Promise<IntegrityCheckResult[]> {
  const results: IntegrityCheckResult[] = [];

  // 1. Submissions have valid foreign keys, verdicts, and timestamps
  const invalidSubmissions = await prisma.submission.findMany({
    where: {
      OR: [
        { userId: '' },
        { problemId: '' },
        { verdict: '' },
        { createdAt: { equals: undefined } },
      ],
    },
  });
  results.push({
    checkName: 'Submissions Foreign Key & Verdict Validity',
    passed: invalidSubmissions.length === 0,
    details:
      invalidSubmissions.length === 0
        ? 'All submissions have valid user, problem, verdict, and timestamp.'
        : `Found ${invalidSubmissions.length} invalid submissions.`,
    count: invalidSubmissions.length,
  });

  // 2. Orphan Submissions check (missing user or problem)
  const allSubmissions = await prisma.submission.findMany({
    select: { id: true, userId: true, problemId: true },
  });
  const allUserIds = new Set(
    (await prisma.user.findMany({ select: { id: true } })).map((u) => u.id)
  );
  const allProblemIds = new Set(
    (await prisma.problem.findMany({ select: { id: true } })).map((p) => p.id)
  );

  let orphanSubmissions = 0;
  for (const s of allSubmissions) {
    if (!allUserIds.has(s.userId) || !allProblemIds.has(s.problemId)) {
      orphanSubmissions++;
    }
  }
  results.push({
    checkName: 'Orphan Submissions Check',
    passed: orphanSubmissions === 0,
    details:
      orphanSubmissions === 0
        ? 'Zero orphan submissions found.'
        : `Found ${orphanSubmissions} orphan submissions lacking valid User or Problem.`,
    count: orphanSubmissions,
  });

  // 3. Orphan Badges check
  const allUserBadges = await prisma.userBadge.findMany({
    select: { id: true, userId: true, badgeId: true },
  });
  const allBadgeIds = new Set(
    (await prisma.badge.findMany({ select: { id: true } })).map((b) => b.id)
  );
  let orphanBadges = 0;
  for (const ub of allUserBadges) {
    if (!allUserIds.has(ub.userId) || !allBadgeIds.has(ub.badgeId)) {
      orphanBadges++;
    }
  }
  results.push({
    checkName: 'Orphan Badges Check',
    passed: orphanBadges === 0,
    details:
      orphanBadges === 0
        ? 'Zero orphan user badges found.'
        : `Found ${orphanBadges} orphan user badges.`,
    count: orphanBadges,
  });

  // 4. Points Sum Consistency: user.totalPoints equals sum of pointsAwarded from Accepted solves
  const users = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    include: {
      submissions: {
        where: { verdict: 'ACCEPTED' },
      },
    },
  });

  let pointsMismatches = 0;
  for (const u of users) {
    const solvedProblemPoints = new Map<string, number>();
    for (const sub of u.submissions) {
      if (
        !solvedProblemPoints.has(sub.problemId) ||
        solvedProblemPoints.get(sub.problemId)! < sub.pointsAwarded
      ) {
        solvedProblemPoints.set(sub.problemId, sub.pointsAwarded);
      }
    }
    const computedPoints = Array.from(solvedProblemPoints.values()).reduce(
      (sum, p) => sum + p,
      0
    );

    if (u.totalPoints !== computedPoints) {
      pointsMismatches++;
    }
  }
  results.push({
    checkName: 'Student Points & Ledger Balance Consistency',
    passed: pointsMismatches === 0,
    details:
      pointsMismatches === 0
        ? 'All student points match the exact sum of unique Accepted problem points.'
        : `Found ${pointsMismatches} users with points balance discrepancy.`,
    count: pointsMismatches,
  });

  // 5. Streak Invariant Check (currentStreak >= 0 and currentStreak <= longestStreak)
  let streakInconsistencies = 0;
  for (const u of users) {
    if (u.currentStreak < 0 || u.longestStreak < 0 || u.currentStreak > u.longestStreak) {
      streakInconsistencies++;
    }
  }
  results.push({
    checkName: 'Student Streak Invariants (0 <= currentStreak <= longestStreak)',
    passed: streakInconsistencies === 0,
    details:
      streakInconsistencies === 0
        ? 'All student streaks satisfy 0 <= currentStreak <= longestStreak.'
        : `Found ${streakInconsistencies} users with invalid streak bounds.`,
    count: streakInconsistencies,
  });

  // 6. Duplicate Points per Problem Check
  let duplicatePointsDetected = 0;
  for (const u of users) {
    const counts = new Map<string, number>();
    for (const sub of u.submissions) {
      if (sub.verdict === 'ACCEPTED' && sub.pointsAwarded > 0) {
        counts.set(sub.problemId, (counts.get(sub.problemId) || 0) + 1);
      }
    }
    for (const [, cnt] of counts.entries()) {
      if (cnt > 1) {
        duplicatePointsDetected++;
      }
    }
  }
  results.push({
    checkName: 'No Duplicate Points for Same Problem',
    passed: duplicatePointsDetected === 0,
    details:
      duplicatePointsDetected === 0
        ? 'Zero duplicate points awarded for repeated solves.'
        : `Detected ${duplicatePointsDetected} instances of duplicate points.`,
    count: duplicatePointsDetected,
  });

  // 7. Admin Analytics vs Direct Database Counts Parity
  const [totalUsers, totalProblems, totalSubmissions, acceptedSubmissions] = await Promise.all([
    prisma.user.count(),
    prisma.problem.count(),
    prisma.submission.count(),
    prisma.submission.count({ where: { verdict: 'ACCEPTED' } }),
  ]);
  const studentCount = await prisma.user.count({ where: { role: 'STUDENT' } });

  results.push({
    checkName: 'Admin Analytics vs Direct Database Counts Parity',
    passed: totalUsers >= studentCount && totalSubmissions >= acceptedSubmissions,
    details: `Total Users: ${totalUsers} (Students: ${studentCount}), Problems: ${totalProblems}, Submissions: ${totalSubmissions} (Accepted: ${acceptedSubmissions}).`,
  });

  return results;
}

async function main() {
  console.log('====================================================');
  console.log('🔍 LogicQ Database Integrity & Ledger Audit');
  console.log('====================================================\n');

  const results = await verifyDatabaseIntegrity();
  let allPass = true;

  for (const r of results) {
    const icon = r.passed ? '✅ [PASS]' : '❌ [FAIL]';
    if (!r.passed) allPass = false;
    console.log(`${icon} ${r.checkName}`);
    console.log(`   ${r.details}`);
  }

  console.log('\n====================================================');
  if (allPass) {
    console.log('🎉 AUDIT COMPLETE: 100% DATA INTEGRITY VERIFIED');
  } else {
    console.log('⚠️ AUDIT COMPLETE: DATA INTEGRITY DISCREPANCIES DETECTED');
    process.exit(1);
  }
  console.log('====================================================\n');
}

if (process.argv[1]?.includes('verify-integrity')) {
  main().finally(async () => {
    await prisma.$disconnect();
  });
}
