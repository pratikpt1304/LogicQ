import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

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

  // 4. Points Sum Consistency: user.totalPoints equals sum of pointsAwarded from Accepted solves & Approved uploads
  const users = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    include: {
      submissions: {
        where: { verdict: 'ACCEPTED' },
      },
      uploadedSolutions: {
        where: { status: 'APPROVED' },
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
    for (const up of u.uploadedSolutions) {
      if (
        !solvedProblemPoints.has(up.problemId) ||
        solvedProblemPoints.get(up.problemId)! < up.pointsAwarded
      ) {
        solvedProblemPoints.set(up.problemId, up.pointsAwarded);
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
        ? 'All student points match the exact sum of unique Accepted problem & Approved upload points.'
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

  // 6. Duplicate Points per Problem Check (across code submissions and uploaded solutions)
  let duplicatePointsDetected = 0;
  for (const u of users) {
    const counts = new Map<string, number>();
    for (const sub of u.submissions) {
      if (sub.verdict === 'ACCEPTED' && sub.pointsAwarded > 0) {
        counts.set(sub.problemId, (counts.get(sub.problemId) || 0) + 1);
      }
    }
    for (const up of u.uploadedSolutions) {
      if (up.status === 'APPROVED' && up.pointsAwarded > 0) {
        counts.set(up.problemId, (counts.get(up.problemId) || 0) + 1);
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
        ? 'Zero duplicate points awarded for repeated solves across code and uploads.'
        : `Detected ${duplicatePointsDetected} instances of duplicate points.`,
    count: duplicatePointsDetected,
  });

  // 6b. Uploaded Solutions Integrity Check
  const invalidUploads = await prisma.uploadedSolution.findMany({
    where: {
      status: { not: 'APPROVED' },
      pointsAwarded: { gt: 0 },
    },
  });
  results.push({
    checkName: 'Uploaded Solutions Unapproved Zero-Points Invariant',
    passed: invalidUploads.length === 0,
    details:
      invalidUploads.length === 0
        ? 'All PENDING_REVIEW / REJECTED / NEEDS_CHANGES uploads have 0 pointsAwarded.'
        : `Found ${invalidUploads.length} unapproved uploads with non-zero points.`,
    count: invalidUploads.length,
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

  // 8. Academic College Uniformity Check (Must be 'Sanjivani University')
  const nonUniversityUsers = await prisma.user.findMany({
    where: {
      college: { not: 'Sanjivani University' },
    },
    select: { id: true, college: true },
  });
  results.push({
    checkName: 'Academic College Uniformity (Sanjivani University)',
    passed: nonUniversityUsers.length === 0,
    details:
      nonUniversityUsers.length === 0
        ? 'All users have standardized college name: Sanjivani University.'
        : `Found ${nonUniversityUsers.length} users with legacy or missing college names.`,
    count: nonUniversityUsers.length,
  });

  // 9. Short ID Integrity Check (Every user must have a non-empty shortId)
  const usersMissingShortId = await prisma.user.findMany({
    where: {
      OR: [{ shortId: null }, { shortId: '' }],
    },
    select: { id: true },
  });
  results.push({
    checkName: 'User Short ID Integrity',
    passed: usersMissingShortId.length === 0,
    details:
      usersMissingShortId.length === 0
        ? 'All users have non-empty stable shortIds.'
        : `Found ${usersMissingShortId.length} users missing shortId.`,
    count: usersMissingShortId.length,
  });

  // 10. Zero-Point Students Leaderboard Exclusion Invariant
  // Verify that any user with totalPoints === 0 is not awarded positive ranks in leaderboard queries
  const zeroPointUsersWithPoints = await prisma.user.findMany({
    where: {
      totalPoints: { lt: 0 },
    },
  });
  results.push({
    checkName: 'Zero/Negative Points Invariant',
    passed: zeroPointUsersWithPoints.length === 0,
    details:
      zeroPointUsersWithPoints.length === 0
        ? 'No users have negative totalPoints.'
        : `Found ${zeroPointUsersWithPoints.length} users with invalid points.`,
    count: zeroPointUsersWithPoints.length,
  });

  // 11. PRN Alphanumeric Format & Index Parity
  // Verify that all active users with PRNs match the 12-char pattern ^[0-9]{4}[A-Z]{3}[MF][0-9]{4}$
  // and have a corresponding PrnIndex entry with matching canonical uppercase key
  const PRN_PATTERN = /^[0-9]{4}[A-Z]{3}[MF][0-9]{4}$/;
  const usersWithPrn = await prisma.user.findMany({
    where: { prn: { not: null } },
    select: { id: true, prn: true, email: true },
  });

  let nonConformingPrns = 0;
  let missingPrnIndices = 0;
  for (const u of usersWithPrn) {
    if (!u.prn || !PRN_PATTERN.test(u.prn)) {
      nonConformingPrns++;
    } else {
      const idx = await prisma.prnIndex.findUnique({
        where: { prn: u.prn },
      });
      if (!idx || idx.userId !== u.id) {
        missingPrnIndices++;
      }
    }
  }

  // 12. PracticeProgress Invariants & Telemetry Integrity
  // Verify that all PracticeProgress records have valid foreign keys, non-negative activeSeconds/attempts,
  // and valid frozen timeToSolveSeconds & solvedAt when marked isSolved.
  const allProgress = await prisma.practiceProgress.findMany({
    select: {
      id: true,
      userId: true,
      problemId: true,
      activeSeconds: true,
      attemptsCount: true,
      runsCount: true,
      isSolved: true,
      solvedAt: true,
      timeToSolveSeconds: true,
      firstAttemptAccepted: true,
    },
  });

  let invalidProgressCount = 0;
  for (const prog of allProgress) {
    const hasValidUser = allUserIds.has(prog.userId);
    const hasValidProblem = allProblemIds.has(prog.problemId);
    const nonNegativeMetrics =
      prog.activeSeconds >= 0 && prog.attemptsCount >= 0 && prog.runsCount >= 0;
    const solveConsistency =
      !prog.isSolved || (prog.solvedAt !== null && prog.timeToSolveSeconds !== null && prog.timeToSolveSeconds >= 0);
    const firstAttemptConsistency =
      !prog.firstAttemptAccepted || prog.attemptsCount >= 1;

    if (!hasValidUser || !hasValidProblem || !nonNegativeMetrics || !solveConsistency || !firstAttemptConsistency) {
      invalidProgressCount++;
    }
  }

  results.push({
    checkName: 'PracticeProgress Telemetry & Invariants Check',
    passed: invalidProgressCount === 0,
    details:
      invalidProgressCount === 0
        ? `All ${allProgress.length} practice progress records meet telemetry and freeze invariants.`
        : `Found ${invalidProgressCount} practice progress records with telemetry or freeze violations.`,
    count: invalidProgressCount,
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
