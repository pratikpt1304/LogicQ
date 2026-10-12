import 'dotenv/config';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      submissions: true,
      uploadedSolutions: true,
      userBadges: true,
      prnIndexes: true,
      practiceProgress: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const summary = users.map((u, i) => ({
    index: i + 1,
    id: u.id,
    email: u.email,
    username: u.username,
    role: u.role,
    prn: u.prn,
    shortId: u.shortId,
    totalPoints: u.totalPoints,
    currentStreak: u.currentStreak,
    longestStreak: u.longestStreak,
    submissions: u.submissions.length,
    uploads: u.uploadedSolutions.length,
    badges: u.userBadges.length,
    prnIndexes: u.prnIndexes.length,
    practiceProgress: u.practiceProgress.length,
    createdAt: u.createdAt.toISOString(),
  }));

  fs.writeFileSync('audit-users.json', JSON.stringify(summary, null, 2));
  console.log(`Saved ${summary.length} user records to audit-users.json`);
}

main().finally(() => prisma.$disconnect());
