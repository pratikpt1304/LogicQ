import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

import { LocalGccJudge } from '../src/judge/local-gcc.judge';
import { Verdict } from '../src/judge/judge.interface';
import { PRACTICE_MODULE_1_PROBLEMS, PracticeProblemDef } from '../src/data/practice-module1.data';
import { PRACTICE_MODULE_2_PROBLEMS } from '../src/data/practice-module2.data';
import { PRACTICE_MODULE_3_PROBLEMS } from '../src/data/practice-module3.data';
import { PRACTICE_MODULE_4_PROBLEMS } from '../src/data/practice-module4.data';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function validateProblem(judge: LocalGccJudge, problem: PracticeProblemDef, index: number, total: number) {
  process.stdout.write(`[${index + 1}/${total}] Validating ${problem.slug}... `);

  // 1. Validate reference solution passes all sample + hidden tests
  const allTests = [...problem.sampleTests, ...problem.hiddenTests];
  for (let t = 0; t < allTests.length; t++) {
    const test = allTests[t];
    const res = await judge.compileAndRun(
      problem.solutionCode,
      test.input,
      problem.timeLimitMs,
      problem.memoryLimitMb
    );

    const normActual = (res.stdout || '').trim().replace(/\r\n/g, '\n');
    const normExpected = test.expectedOutput.trim().replace(/\r\n/g, '\n');

    if (res.verdict !== Verdict.ACCEPTED || normActual !== normExpected) {
      console.log(`FAILED!`);
      console.error(`  Reference solution failed test #${t + 1}:`);
      console.error(`  Input: ${JSON.stringify(test.input)}`);
      console.error(`  Expected: ${JSON.stringify(normExpected)}`);
      console.error(`  Actual stdout: ${JSON.stringify(normActual)}`);
      console.error(`  Verdict: ${res.verdict}, stderr: ${res.stderr || ''}, compile: ${res.compileOutput || ''}`);
      throw new Error(`Reference solution failed for ${problem.slug}`);
    }
  }

  // 2. Validate wrongSolution1 fails at least 1 test
  let wrong1Failed = false;
  for (const test of allTests) {
    const res = await judge.compileAndRun(
      problem.wrongSolution1,
      test.input,
      problem.timeLimitMs,
      problem.memoryLimitMb
    );
    const normActual = (res.stdout || '').trim().replace(/\r\n/g, '\n');
    const normExpected = test.expectedOutput.trim().replace(/\r\n/g, '\n');
    if (res.verdict !== Verdict.ACCEPTED || normActual !== normExpected) {
      wrong1Failed = true;
      break;
    }
  }
  if (!wrong1Failed) {
    throw new Error(`wrongSolution1 did NOT fail any test for ${problem.slug}`);
  }

  // 3. Validate wrongSolution2 fails at least 1 test
  let wrong2Failed = false;
  for (const test of allTests) {
    const res = await judge.compileAndRun(
      problem.wrongSolution2,
      test.input,
      problem.timeLimitMs,
      problem.memoryLimitMb
    );
    const normActual = (res.stdout || '').trim().replace(/\r\n/g, '\n');
    const normExpected = test.expectedOutput.trim().replace(/\r\n/g, '\n');
    if (res.verdict !== Verdict.ACCEPTED || normActual !== normExpected) {
      wrong2Failed = true;
      break;
    }
  }
  if (!wrong2Failed) {
    throw new Error(`wrongSolution2 did NOT fail any test for ${problem.slug}`);
  }

  console.log(`PASSED (Ref + 2 Wrong valid)`);
}

async function main() {
  const allProblems: PracticeProblemDef[] = [
    ...PRACTICE_MODULE_1_PROBLEMS,
    ...PRACTICE_MODULE_2_PROBLEMS,
    ...PRACTICE_MODULE_3_PROBLEMS,
    ...PRACTICE_MODULE_4_PROBLEMS,
  ];

  console.log(`Starting validation for ${allProblems.length} practice problems across 4 modules...`);
  const judge = new LocalGccJudge();
  const available = await judge.isAvailable();
  if (!available) {
    throw new Error('Local GCC compiler is not available on this machine.');
  }

  for (let i = 0; i < allProblems.length; i++) {
    await validateProblem(judge, allProblems[i], i, allProblems.length);
  }

  console.log(`\nAll 40 problems passed GCC validation successfully!`);
  console.log(`Upserting problems into database...`);

  for (const p of allProblems) {
    const existing = await prisma.problem.findUnique({
      where: { slug: p.slug },
      include: { testCases: true },
    });

    const problemData = {
      title: p.title,
      description: p.description,
      difficulty: p.difficulty,
      category: p.category,
      tags: JSON.stringify(p.tags),
      starterCode: p.starterCode,
      solutionCode: p.solutionCode,
      timeLimitMs: p.timeLimitMs,
      memoryLimitMb: p.memoryLimitMb,
      basePoints: p.basePoints,
      isPractice: true,
      moduleSlug: p.moduleSlug,
      moduleOrder: p.moduleOrder,
      status: 'PUBLISHED',
      sourceType: 'PRACTICE',
    };

    let problemId: string;
    if (existing) {
      await prisma.problem.update({
        where: { id: existing.id },
        data: problemData,
      });
      problemId = existing.id;
      // Refresh test cases
      await prisma.testCase.deleteMany({ where: { problemId } });
    } else {
      const created = await prisma.problem.create({
        data: {
          slug: p.slug,
          ...problemData,
        },
      });
      problemId = created.id;
    }

    // Insert sample and hidden test cases
    let orderIndex = 0;
    for (const st of p.sampleTests) {
      await prisma.testCase.create({
        data: {
          problemId,
          input: st.input,
          expectedOutput: st.expectedOutput,
          isHidden: false,
          orderIndex: orderIndex++,
        },
      });
    }
    for (const ht of p.hiddenTests) {
      await prisma.testCase.create({
        data: {
          problemId,
          input: ht.input,
          expectedOutput: ht.expectedOutput,
          isHidden: true,
          orderIndex: orderIndex++,
        },
      });
    }
  }

  console.log(`Successfully seeded ${allProblems.length} practice problems into database!`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('\nValidation/Seeding failed:', err);
  process.exit(1);
});
