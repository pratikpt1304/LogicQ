import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

const prisma = new PrismaClient();

function generateShortId(seed?: string): string {
  if (seed) {
    const hash = crypto.createHash('sha256').update(seed).digest('hex');
    return hash.substring(0, 4).toUpperCase();
  }
  return crypto.randomBytes(2).toString('hex').toUpperCase();
}

async function main() {
  console.log('🔄 Starting College & ShortId Migration...');

  // 1. Migrate college names: Update ANY user where college is not 'Sanjivani University'
  const nonUniversityUsers = await prisma.user.findMany({
    where: {
      college: { not: 'Sanjivani University' },
    },
  });

  console.log(`Found ${nonUniversityUsers.length} users with non-standard college:`, nonUniversityUsers.map(u => ({ id: u.id, username: u.username, college: u.college })));

  const collegeUpdateResult = await prisma.user.updateMany({
    where: {
      college: { not: 'Sanjivani University' },
    },
    data: {
      college: 'Sanjivani University',
    },
  });

  console.log(`✅ Updated ${collegeUpdateResult.count} users to college: 'Sanjivani University'.`);

  // 2. Ensure every user has a deterministic, non-null shortId
  const usersMissingShortId = await prisma.user.findMany({
    where: {
      OR: [
        { shortId: null },
        { shortId: '' },
      ],
    },
  });

  console.log(`Found ${usersMissingShortId.length} users missing shortId.`);

  let shortIdUpdatedCount = 0;
  for (const user of usersMissingShortId) {
    const shortId = generateShortId(user.id);
    await prisma.user.update({
      where: { id: user.id },
      data: { shortId },
    });
    shortIdUpdatedCount++;
  }

  console.log(`✅ Populated stable shortId for ${shortIdUpdatedCount} users.`);
  console.log('🎉 Migration completed successfully.');
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
