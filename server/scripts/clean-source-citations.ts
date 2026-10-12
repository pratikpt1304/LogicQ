import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Sanitizing problem descriptions in database...');
  const problems = await prisma.problem.findMany();
  let updatedCount = 0;

  for (const p of problems) {
    let desc = p.description;
    // Strip parenthetical book citation: e.g. (Yashavant Kanetkar, *Test Your C Skills*, Chapter X: ...)
    // Or (Yashavant Kanetkar, ...) or (Kanetkar, ...)
    const cleaned = desc
      .replace(/\s*\([^)]*(?:Kanetkar|Test Your C Skills)[^)]*\)/gi, '')
      .replace(/\s*\(Chapter \d+:[^)]*\)/gi, '')
      .trim();

    if (cleaned !== desc) {
      console.log(`Cleaning problem: ${p.slug}`);
      await prisma.problem.update({
        where: { id: p.id },
        data: { description: cleaned },
      });
      updatedCount++;
    }
  }

  console.log(`Cleaned ${updatedCount} problem descriptions in SQLite database.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
