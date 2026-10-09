import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('====================================================');
  console.log('🚀 LogicQ Production Launch Reset Procedure');
  console.log('====================================================');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // 1. Take snapshot backup of SQLite database file
  const dbPath = path.resolve(process.cwd(), 'prisma', 'dev.db');
  if (fs.existsSync(dbPath)) {
    const backupFilePath = path.join(backupDir, `dev.db.pre_launch_backup_${timestamp}`);
    fs.copyFileSync(dbPath, backupFilePath);
    console.log(`✅ Backup successfully created at: ${backupFilePath}`);
  } else {
    console.log('ℹ️ No existing dev.db file to copy directly, proceeding with database queries.');
  }

  // 2. Count existing records before reset
  const preUsers = await prisma.user.count();
  const preSubmissions = await prisma.submission.count();
  const preContests = await prisma.contest.count();
  const preUserBadges = await prisma.userBadge.count();
  const preParticipants = await prisma.contestParticipant.count();

  console.log('\n📊 Pre-reset database statistics:');
  console.log(`- Total Users: ${preUsers}`);
  console.log(`- Total Submissions: ${preSubmissions}`);
  console.log(`- User Badges: ${preUserBadges}`);
  console.log(`- Contests: ${preContests}`);
  console.log(`- Contest Participants: ${preParticipants}`);

  // 3. Purge test activity, demo records, and dummy students
  console.log('\n🧹 Purging test records and activity...');

  // A. Delete all test submissions & per-test results (cascade will handle results)
  await prisma.submissionTestCaseResult.deleteMany({});
  await prisma.submission.deleteMany({});
  console.log('  ✓ Purged all submissions and execution results');

  // B. Delete all user badge unlocks
  await prisma.userBadge.deleteMany({});
  console.log('  ✓ Purged all user badge unlocks');

  // C. Delete all contest participants and contest problem mappings
  await prisma.contestParticipant.deleteMany({});
  await prisma.contestProblem.deleteMany({});
  await prisma.contest.deleteMany({});
  console.log('  ✓ Purged all demo contests and participant leaderboards');

  // D. Delete all refresh tokens
  await prisma.refreshToken.deleteMany({});
  console.log('  ✓ Purged all active sessions and refresh tokens');

  // E. Delete all non-admin users (all sample students)
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@logicq.io';
  const deletedStudents = await prisma.user.deleteMany({
    where: {
      role: { not: 'ADMIN' },
    },
  });
  console.log(`  ✓ Removed ${deletedStudents.count} demo/sample student accounts`);

  // F. Reset Admin user's statistics to zero
  await prisma.user.updateMany({
    where: { role: 'ADMIN' },
    data: {
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastSolvedDate: null,
      bio: 'Core Platform Administrator & Judge Maintainer',
      college: 'LogicQ Operations',
    },
  });
  console.log('  ✓ Reset Administrator points, streak, and activity to zero');

  // 4. Ensure Today's Daily Challenge is set correctly
  const now = new Date();
  const istDateString = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

  // Set the featured daily challenge to be active for today's IST date
  const dailyProblem = await prisma.problem.findFirst({
    where: { slug: 'daily-longest-unique-substring' },
  });

  if (dailyProblem) {
    await prisma.problem.update({
      where: { id: dailyProblem.id },
      data: {
        isDaily: true,
        scheduledDate: istDateString,
      },
    });
    console.log(`  ✓ Scheduled today's featured daily challenge (${dailyProblem.title}) for ${istDateString}`);
  }

  // 5. Verify post-reset record counts
  const postUsers = await prisma.user.count();
  const postSubmissions = await prisma.submission.count();
  const postContests = await prisma.contest.count();
  const postProblems = await prisma.problem.count();
  const postBadges = await prisma.badge.count();
  const postUserBadges = await prisma.userBadge.count();

  console.log('\n✨ Post-reset clean database state:');
  console.log(`- Registered Users: ${postUsers} (System Administrator only)`);
  console.log(`- Global Submissions: ${postSubmissions} (Clean zero)`);
  console.log(`- Contests: ${postContests} (Clean zero, ready for real events)`);
  console.log(`- Unlocked Badges: ${postUserBadges} (Clean zero)`);
  console.log(`- Master Problems: ${postProblems} (Curated C challenges preserved)`);
  console.log(`- Master Badges: ${postBadges} (Achievement definitions preserved)`);

  console.log('\n🎉 Production launch reset completed successfully!');
}

main()
  .catch((err) => {
    console.error('❌ Reset failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
