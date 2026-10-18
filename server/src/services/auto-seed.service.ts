import { prisma } from '../utils/prisma.js';
import bcrypt from 'bcryptjs';
import { PRACTICE_MODULE_1_PROBLEMS, PracticeProblemDef } from '../data/practice-module1.data.js';
import { PRACTICE_MODULE_2_PROBLEMS } from '../data/practice-module2.data.js';
import { PRACTICE_MODULE_3_PROBLEMS } from '../data/practice-module3.data.js';
import { PRACTICE_MODULE_4_PROBLEMS } from '../data/practice-module4.data.js';
import { KANETKAR_BOOK_PROBLEMS } from '../data/kanetkar-book-bank.js';

const BADGES = [
  {
    slug: 'first-blood',
    name: 'First Blood',
    description: 'Submit your first Accepted C solution on LogicQ',
    iconName: 'Zap',
    category: 'SOLVE_COUNT',
    requirementCount: 1,
  },
  {
    slug: 'streak-7',
    name: 'Week Warrior',
    description: 'Maintain an active 7-day daily challenge streak',
    iconName: 'Flame',
    category: 'STREAK',
    requirementCount: 7,
  },
  {
    slug: 'streak-30',
    name: 'Iron Coder',
    description: 'Maintain an active 30-day daily challenge streak',
    iconName: 'Award',
    category: 'STREAK',
    requirementCount: 30,
  },
  {
    slug: 'solved-10',
    name: 'Decathlete',
    description: 'Successfully solve 10 distinct LogicQ challenges',
    iconName: 'CheckCircle2',
    category: 'SOLVE_COUNT',
    requirementCount: 10,
  },
  {
    slug: 'hard-solver',
    name: 'Pointer Virtuoso',
    description: 'Conquer 3 Hard-difficulty C challenges with clean memory',
    iconName: 'ShieldAlert',
    category: 'DIFFICULTY',
    requirementCount: 3,
  },
  {
    slug: 'contest-finisher',
    name: 'Weekly Champion',
    description: 'Finish in the top tier of the Weekly Leaderboard with consistent C solutions',
    iconName: 'Trophy',
    category: 'WEEKLY',
    requirementCount: 1,
  },
];

export async function autoSeedDatabase(): Promise<void> {
  try {
    // 1. Seed Badges if table is empty
    const badgeCount = await prisma.badge.count();
    if (badgeCount === 0) {
      console.log('⚡ Auto-seeding default badges...');
      for (const b of BADGES) {
        await prisma.badge.upsert({
          where: { slug: b.slug },
          update: b,
          create: b,
        });
      }
      console.log('⚡ Badges seeded.');
    }

    // 2. Seed Practice Curriculum (40 problems across 4 modules)
    const practiceCount = await prisma.problem.count({ where: { isPractice: true } });
    if (practiceCount < 40) {
      console.log(`⚡ Auto-seeding practice curriculum (current count: ${practiceCount})...`);
      const allPractice: PracticeProblemDef[] = [
        ...PRACTICE_MODULE_1_PROBLEMS,
        ...PRACTICE_MODULE_2_PROBLEMS,
        ...PRACTICE_MODULE_3_PROBLEMS,
        ...PRACTICE_MODULE_4_PROBLEMS,
      ];

      for (const p of allPractice) {
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

        const existing = await prisma.problem.findUnique({
          where: { slug: p.slug },
          select: { id: true },
        });

        let problemId: string;
        if (existing) {
          await prisma.problem.update({
            where: { id: existing.id },
            data: problemData,
          });
          problemId = existing.id;
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

        const allTests = [
          ...p.sampleTests.map((t, idx) => ({ ...t, isHidden: false, orderIndex: idx })),
          ...p.hiddenTests.map((t, idx) => ({ ...t, isHidden: true, orderIndex: p.sampleTests.length + idx })),
        ];

        for (const tc of allTests) {
          await prisma.testCase.create({
            data: {
              problemId,
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              isHidden: tc.isHidden,
              orderIndex: tc.orderIndex,
            },
          });
        }
      }
      console.log(`⚡ Seeded ${allPractice.length} practice problems successfully.`);
    }

    // 3. Seed Yashavant Kanetkar Book Problems
    const bookCount = await prisma.problem.count({ where: { sourceType: 'BOOK' } });
    if (bookCount === 0) {
      console.log('⚡ Auto-seeding Yashavant Kanetkar book bank...');
      for (const bp of KANETKAR_BOOK_PROBLEMS) {
        const problemData = {
          title: bp.title,
          difficulty: bp.difficulty,
          category: bp.category,
          tags: JSON.stringify(bp.tags),
          description: bp.description,
          starterCode: bp.starterCode,
          solutionCode: bp.solutionCode,
          timeLimitMs: bp.timeLimitMs,
          memoryLimitMb: bp.memoryLimitMb,
          basePoints: bp.basePoints,
          sourceType: bp.sourceType,
          sourceRefJson: JSON.stringify(bp.sourceRef),
          status: 'PUBLISHED',
        };

        const existing = await prisma.problem.findUnique({
          where: { slug: bp.slug },
          select: { id: true },
        });

        let problemId: string;
        if (existing) {
          await prisma.problem.update({
            where: { id: existing.id },
            data: problemData,
          });
          problemId = existing.id;
          await prisma.testCase.deleteMany({ where: { problemId } });
        } else {
          const created = await prisma.problem.create({
            data: {
              slug: bp.slug,
              ...problemData,
            },
          });
          problemId = created.id;
        }

        const allTests = [
          ...bp.sampleTests.map((t, idx) => ({ ...t, isHidden: false, orderIndex: idx })),
          ...bp.hiddenTests.map((t, idx) => ({ ...t, isHidden: true, orderIndex: bp.sampleTests.length + idx })),
        ];

        for (const tc of allTests) {
          await prisma.testCase.create({
            data: {
              problemId,
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              isHidden: tc.isHidden,
              orderIndex: tc.orderIndex,
            },
          });
        }
      }
      console.log(`⚡ Seeded ${KANETKAR_BOOK_PROBLEMS.length} Kanetkar book problems.`);
    }

    // 4. Seed Canonical Daily / Contest Problems if needed
    const dailyProblemCount = await prisma.problem.count({
      where: { slug: 'daily-longest-unique-substring' },
    });
    if (dailyProblemCount === 0) {
      console.log('⚡ Auto-seeding canonical daily challenge problem...');
      const p = await prisma.problem.create({
        data: {
          slug: 'daily-longest-unique-substring',
          title: 'Longest Substring Without Repeating Characters',
          difficulty: 'MEDIUM',
          category: 'Strings & Hash/Lookup',
          tags: JSON.stringify(['Strings', 'Sliding-Window', 'Lookup']),
          description: `Given a string s, find the length of the longest substring without repeating characters.`,
          starterCode: `#include <stdio.h>\n#include <string.h>\n\nint main() {\n    char s[1000];\n    if (scanf("%s", s) != 1) return 0;\n    return 0;\n}`,
          solutionCode: `#include <stdio.h>\n#include <string.h>\n\nint lengthOfLongestSubstring(char * s) {\n    int n = strlen(s);\n    int res = 0;\n    int last[256];\n    for (int i = 0; i < 256; i++) last[i] = -1;\n    int start = 0;\n    for (int end = 0; end < n; end++) {\n        unsigned char c = (unsigned char)s[end];\n        if (last[c] >= start) start = last[c] + 1;\n        last[c] = end;\n        int len = end - start + 1;\n        if (len > res) res = len;\n    }\n    return res;\n}\n\nint main() {\n    char s[1000];\n    if (scanf("%s", s) == 1) {\n        printf("%d\\n", lengthOfLongestSubstring(s));\n    }\n    return 0;\n}`,
          timeLimitMs: 1000,
          memoryLimitMb: 64,
          basePoints: 20,
          isDaily: true,
          status: 'PUBLISHED',
        },
      });
      await prisma.testCase.createMany({
        data: [
          { problemId: p.id, input: 'abcabcbb\n', expectedOutput: '3\n', isHidden: false, orderIndex: 0 },
          { problemId: p.id, input: 'bbbbb\n', expectedOutput: '1\n', isHidden: false, orderIndex: 1 },
          { problemId: p.id, input: 'pwwkew\n', expectedOutput: '3\n', isHidden: false, orderIndex: 2 },
          { problemId: p.id, input: 'abcdef\n', expectedOutput: '6\n', isHidden: true, orderIndex: 3 },
        ],
      });
    }

    // 5. Ensure Core Admins Exist in Database
    const adminEmail = 'admin@logicq.io';
    const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!existingAdmin) {
      const adminHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'AdminPassword123!', 10);
      await prisma.user.create({
        data: {
          username: 'admin',
          email: adminEmail,
          fullName: 'LogicQ Administrator',
          passwordHash: adminHash,
          role: 'ADMIN',
          bio: 'Core Platform Administrator & Judge Maintainer',
          college: 'LogicQ Operations',
        },
      });
    }
  } catch (error) {
    console.error('⚠️ Warning: Auto-seed encountered an error (continuing boot):', error);
  }
}
