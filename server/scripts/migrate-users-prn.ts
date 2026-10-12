import { PrismaClient } from '@prisma/client';
import { generateShortId, PRN_REGEX } from '../src/config/academic.config.js';

const prisma = new PrismaClient();

/**
 * Migration Script: Move existing test/legacy users to the PRN + Academic Profile schema.
 * - Preserves all points, streaks, badges, and submissions.
 * - Generates a shortId for fallback public display ("Student XXXX") if missing.
 * - Syncs existing valid 12-digit PRNs into the PrnIndex table.
 * - Marks any STUDENT account missing PRN, College, Department, or Year with `profileComplete: false`
 *   so they are prompted to complete their profile on next login without losing points or submissions.
 */
export async function migrateUsersToPrnSchema() {
  const users = await prisma.user.findMany();
  let completedCount = 0;
  let incompleteMarkedCount = 0;

  for (const user of users) {
    const shortId = user.shortId || generateShortId(user.id);

    if (user.role === 'ADMIN') {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          shortId,
          profileComplete: true,
          college: user.college || 'Sanjivani University',
        },
      });
      completedCount++;
      continue;
    }

    const hasValidPrn = Boolean(user.prn && PRN_REGEX.test(user.prn));
    const hasRequiredFields = Boolean(
      hasValidPrn && user.college && user.department && user.year
    );

    if (hasRequiredFields && user.prn) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: {
            shortId,
            profileComplete: true,
          },
        }),
        prisma.prnIndex.upsert({
          where: { prn: user.prn },
          update: { userId: user.id },
          create: { prn: user.prn, userId: user.id },
        }),
      ]);
      completedCount++;
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          shortId,
          profileComplete: false,
        },
      });
      incompleteMarkedCount++;
    }
  }

  return { total: users.length, completedCount, incompleteMarkedCount };
}

if (process.argv[1] && process.argv[1].includes('migrate-users-prn')) {
  migrateUsersToPrnSchema()
    .then((res) => {
      console.log('Migration complete:', res);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
