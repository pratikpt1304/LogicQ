import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedQA() {
  console.log('====================================================');
  console.log('🌱 Seeding LogicQ Clean QA Test Environment');
  console.log('====================================================\n');

  // 1. Purge transient records (submissions, user badges, contest participants)
  console.log('1. Clearing transient test activity...');
  await prisma.submissionTestCaseResult.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.contestParticipant.deleteMany();
  await prisma.refreshToken.deleteMany();

  // 2. Seed Admin
  console.log('2. Provisioning Admin Account...');
  const adminHash = await bcrypt.hash('AdminPassword123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@logicq.io' },
    update: {
      username: 'admin',
      fullName: 'System Administrator',
      role: 'ADMIN',
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      isBanned: false,
    },
    create: {
      email: 'admin@logicq.io',
      username: 'admin',
      fullName: 'System Administrator',
      passwordHash: adminHash,
      role: 'ADMIN',
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      isBanned: false,
    },
  });

  // 3. Seed 3 Students (A, B, C)
  console.log('3. Provisioning 3 Test Students (A, B, C)...');
  const studentPasswordHash = await bcrypt.hash('StudentPassword123!', 10);

  const studentA = await prisma.user.upsert({
    where: { email: 'studentA@logicq.io' },
    update: {
      username: 'student_a',
      fullName: 'Alice Lovelace',
      college: 'MIT Engineering',
      role: 'STUDENT',
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      isBanned: false,
    },
    create: {
      email: 'studentA@logicq.io',
      username: 'student_a',
      fullName: 'Alice Lovelace',
      college: 'MIT Engineering',
      passwordHash: studentPasswordHash,
      role: 'STUDENT',
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      isBanned: false,
    },
  });

  const studentB = await prisma.user.upsert({
    where: { email: 'studentB@logicq.io' },
    update: {
      username: 'student_b',
      fullName: 'Bob Turing',
      college: 'Stanford CS',
      role: 'STUDENT',
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      isBanned: false,
    },
    create: {
      email: 'studentB@logicq.io',
      username: 'student_b',
      fullName: 'Bob Turing',
      college: 'Stanford CS',
      passwordHash: studentPasswordHash,
      role: 'STUDENT',
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      isBanned: false,
    },
  });

  const studentC = await prisma.user.upsert({
    where: { email: 'studentC@logicq.io' },
    update: {
      username: 'student_c',
      fullName: 'Charlie Hopper',
      college: 'UC Berkeley EECS',
      role: 'STUDENT',
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      isBanned: false,
    },
    create: {
      email: 'studentC@logicq.io',
      username: 'student_c',
      fullName: 'Charlie Hopper',
      college: 'UC Berkeley EECS',
      passwordHash: studentPasswordHash,
      role: 'STUDENT',
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      isBanned: false,
    },
  });

  // 4. Schedule Today's Daily Challenge (IST Date: 2026-10-09)
  console.log("4. Setting Today's Daily Challenge...");
  await prisma.problem.updateMany({
    data: { isDaily: false, scheduledDate: null },
  });

  const todayIST = '2026-10-09';
  const dailyProblem = await prisma.problem.update({
    where: { slug: 'daily-longest-unique-substring' },
    data: {
      isDaily: true,
      scheduledDate: todayIST,
      status: 'PUBLISHED',
    },
  });

  // 5. Seed Official Contest
  console.log('5. Provisioning Official Arena Contest...');
  const now = new Date();
  const startTime = new Date(now.getTime() - 60 * 60 * 1000); // Started 1 hour ago
  const endTime = new Date(now.getTime() + 4 * 60 * 60 * 1000); // Ends in 4 hours

  const contest = await prisma.contest.upsert({
    where: { slug: 'genesis-c-arena-1' },
    update: {
      title: 'Genesis C Arena — Round 1',
      description: 'The inaugural competitive programming arena round for LogicQ challengers.',
      startTime,
      endTime,
      durationMinutes: 300,
      status: 'ACTIVE',
    },
    create: {
      slug: 'genesis-c-arena-1',
      title: 'Genesis C Arena — Round 1',
      description: 'The inaugural competitive programming arena round for LogicQ challengers.',
      startTime,
      endTime,
      durationMinutes: 300,
      status: 'ACTIVE',
    },
  });

  // Connect problems to contest
  const contestProblems = ['two-sum', 'daily-longest-unique-substring', 'trapping-rain-water'];
  await prisma.contestProblem.deleteMany({ where: { contestId: contest.id } });

  for (let i = 0; i < contestProblems.length; i++) {
    const p = await prisma.problem.findUnique({ where: { slug: contestProblems[i] } });
    if (p) {
      await prisma.contestProblem.create({
        data: {
          contestId: contest.id,
          problemId: p.id,
          orderIndex: i,
          points: (i + 1) * 100,
        },
      });
    }
  }

  // 6. Seed Master Badges
  console.log('6. Seeding Master Honor Badges...');
  const masterBadges = [
    { slug: 'first-blood', name: 'First Blood', description: 'Solve your very first C challenge', iconName: 'Award', category: 'SOLVE_COUNT', requirementCount: 1 },
    { slug: 'streak-7', name: '7-Day Flame', description: 'Maintain a 7-day solving streak', iconName: 'Flame', category: 'STREAK', requirementCount: 7 },
    { slug: 'streak-30', name: '30-Day Master', description: 'Maintain a 30-day solving streak', iconName: 'Zap', category: 'STREAK', requirementCount: 30 },
    { slug: 'solved-10', name: 'Decathlete', description: 'Solve 10 distinct algorithmic C problems', iconName: 'Trophy', category: 'SOLVE_COUNT', requirementCount: 10 },
    { slug: 'hard-solver', name: 'Kernel Virtuoso', description: 'Solve 3 Hard difficulty C memory challenges', iconName: 'Cpu', category: 'DIFFICULTY', requirementCount: 3 },
  ];

  for (const b of masterBadges) {
    await prisma.badge.upsert({
      where: { slug: b.slug },
      update: b,
      create: b,
    });
  }

  // 7. Print Summary
  console.log('\n✨ QA Test Environment Successfully Seeded:');
  console.log(`- Admin: ${admin.email} (Password: AdminPassword123!)`);
  console.log(`- Student A: ${studentA.email} (Password: StudentPassword123!)`);
  console.log(`- Student B: ${studentB.email} (Password: StudentPassword123!)`);
  console.log(`- Student C: ${studentC.email} (Password: StudentPassword123!)`);
  console.log(`- Daily Challenge: ${dailyProblem.title} (${dailyProblem.slug}) for ${todayIST}`);
  console.log(`- Active Contest: ${contest.title} (${contest.slug})`);
  console.log(`- Total Problems in Catalog: ${await prisma.problem.count()}`);
  console.log(`- Badges Defined: ${await prisma.badge.count()}\n`);
}

seedQA()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
