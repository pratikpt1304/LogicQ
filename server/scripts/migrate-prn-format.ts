import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import {
  PRN_REGEX,
  normalizePrn,
  isValidPrn,
  ALLOWED_PROGRAM_CODES,
} from '../src/config/academic.config.js';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

const prisma = new PrismaClient();

export interface MigrationSummary {
  scannedUsers: number;
  validUpdatedUsers: number;
  alreadyValidUsers: number;
  malformedUsersFlagged: number;
  prnIndexCreated: number;
  prnIndexUpdated: number;
  prnIndexCleaned: number;
  flaggedUserIds: string[];
}

/**
 * Idempotent PRN Format Migration Script:
 * 1. Reads all users with non-null prn.
 * 2. Normalizes to uppercase and trims whitespace.
 * 3. Validates against the 12-character alphanumeric regex ^[0-9]{4}[A-Z]{3}[MF][0-9]{4}$.
 * 4. Updates User records to canonical uppercase.
 * 5. Rebuilds/syncs prnIndex documents to match the canonical uppercase PRN.
 * 6. Flags non-matching/legacy PRN records in console and summary without deleting them.
 * 7. Is completely safe to run multiple times (idempotent).
 */
export async function migratePrnFormat(): Promise<MigrationSummary> {
  const summary: MigrationSummary = {
    scannedUsers: 0,
    validUpdatedUsers: 0,
    alreadyValidUsers: 0,
    malformedUsersFlagged: 0,
    prnIndexCreated: 0,
    prnIndexUpdated: 0,
    prnIndexCleaned: 0,
    flaggedUserIds: [],
  };

  const users = await prisma.user.findMany({
    where: {
      prn: { not: null },
    },
    select: {
      id: true,
      email: true,
      prn: true,
      isBanned: true,
    },
  });

  summary.scannedUsers = users.length;

  for (const user of users) {
    if (!user.prn) continue;

    const normalized = normalizePrn(user.prn);
    const isValid = isValidPrn(normalized, ALLOWED_PROGRAM_CODES);

    if (!isValid) {
      // Non-matching records are flagged, NEVER auto-deleted
      summary.malformedUsersFlagged++;
      summary.flaggedUserIds.push(user.id);
      console.warn(
        `⚠️ [FLAGGED] User ${user.id} (${user.email}) has legacy or non-conforming PRN: "${user.prn}". Preserved for administrative review.`
      );
      continue;
    }

    // If case changed or was untrimmed, update user record
    if (user.prn !== normalized) {
      await prisma.user.update({
        where: { id: user.id },
        data: { prn: normalized },
      });
      summary.validUpdatedUsers++;
    } else {
      summary.alreadyValidUsers++;
    }

    // Sync prnIndex table
    const existingIndex = await prisma.prnIndex.findUnique({
      where: { prn: normalized },
    });

    const indexStatus = user.isBanned ? 'BANNED' : 'ACTIVE';

    if (!existingIndex) {
      // Check if old case index exists
      if (user.prn !== normalized) {
        const oldIndex = await prisma.prnIndex.findUnique({
          where: { prn: user.prn },
        });
        if (oldIndex) {
          await prisma.prnIndex.delete({ where: { prn: user.prn } });
        }
      }

      await prisma.prnIndex.create({
        data: {
          prn: normalized,
          userId: user.id,
          status: indexStatus,
        },
      });
      summary.prnIndexCreated++;
    } else {
      if (existingIndex.userId !== user.id || existingIndex.status !== indexStatus) {
        await prisma.prnIndex.update({
          where: { prn: normalized },
          data: {
            userId: user.id,
            status: indexStatus,
          },
        });
        summary.prnIndexUpdated++;
      }
    }
  }

  // Clean up orphan prnIndex entries if old case keys remained
  const allPrnIndices = await prisma.prnIndex.findMany();
  for (const idx of allPrnIndices) {
    const uppercaseKey = normalizePrn(idx.prn);
    if (idx.prn !== uppercaseKey) {
      // Delete non-canonical key
      await prisma.prnIndex.delete({ where: { prn: idx.prn } });
      summary.prnIndexCleaned++;
    }
  }

  return summary;
}

async function main() {
  console.log('====================================================');
  console.log('🚀 LogicQ PRN Alphanumeric Migration & Index Rebuild');
  console.log('====================================================\n');

  try {
    const summary = await migratePrnFormat();
    console.log(`✅ Scanned Users with PRN: ${summary.scannedUsers}`);
    console.log(`✅ Already Canonical & Valid: ${summary.alreadyValidUsers}`);
    console.log(`✅ Updated to Canonical Uppercase: ${summary.validUpdatedUsers}`);
    console.log(`✅ PrnIndex Records Created: ${summary.prnIndexCreated}`);
    console.log(`✅ PrnIndex Records Updated: ${summary.prnIndexUpdated}`);
    console.log(`✅ Non-canonical Keys Cleaned: ${summary.prnIndexCleaned}`);
    if (summary.malformedUsersFlagged > 0) {
      console.log(
        `⚠️ Flagged Non-conforming Records: ${summary.malformedUsersFlagged} (IDs: ${summary.flaggedUserIds.join(', ')})`
      );
    } else {
      console.log('🎉 All PRNs fully conform to 12-character alphanumeric format.');
    }
    console.log('\n====================================================');
    console.log('MIGRATION COMPLETE (IDEMPOTENT)');
    console.log('====================================================\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.includes('migrate-prn-format')) {
  main();
}
