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

    // 2. Seed Practice Curriculum (80 problems across 4 modules)
    const practiceCount = await prisma.problem.count({ where: { isPractice: true } });
    if (practiceCount < 80) {
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
    if (bookCount < KANETKAR_BOOK_PROBLEMS.length) {
      console.log(`⚡ Syncing Yashavant Kanetkar book bank (${bookCount} -> ${KANETKAR_BOOK_PROBLEMS.length} problems)...`);
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

    // 4. Purge legacy mock daily problem and ensure Kanetkar Book is primary Daily Challenge
    await prisma.testCase.deleteMany({
      where: { problem: { slug: 'daily-longest-unique-substring' } },
    });
    await prisma.problem.deleteMany({
      where: { slug: 'daily-longest-unique-substring' },
    });

    const activeDaily = await prisma.problem.findFirst({
      where: { isDaily: true, status: 'PUBLISHED' },
    });
    if (!activeDaily) {
      const todayIST = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().split('T')[0];
      await prisma.problem.updateMany({
        where: { slug: 'kanetkar-ch1-scope-shadow-eval' },
        data: { isDaily: true, scheduledDate: todayIST },
      });
    }

    // 5. Seed Integrated Capstone Mini-Project (Sections 35 - 39)
    const miniProjectCount = await prisma.miniProject.count();
    if (miniProjectCount === 0) {
      console.log('⚡ Auto-seeding canonical Capstone Mini-Project (Hospital Vitals Triage Console)...');
      await prisma.miniProject.create({
        data: {
          id: 'capstone-mini-project-c11',
          moduleId: 'module-4',
          title: 'Hospital Patient Triage & Vitals Monitoring System',
          scenario: 'You are developing an embedded C11 emergency medical triage and patient monitoring console for City General Hospital.\nThe system continuously ingests patient vitals (Blood Pressure, Heart Rate, SpO2, and Age) and maintains an active priority queue sorted by severity urgency.',
          requirements: `### Technical Specifications & Competencies

1. **Competency 1 — Syntax & Control Flow (5 Marks)**:
   - Implement triage priority classification function:
     \`int calculateTriageLevel(int heartRate, int spO2, int systolicBP)\`
   - Priority 1 (Critical): SpO2 < 90 OR Heart Rate > 140 OR Systolic BP < 90.
   - Priority 2 (Urgent): 90 <= SpO2 <= 94 OR 100 <= Heart Rate <= 140.
   - Priority 3 (Standard): All vitals in stable nominal ranges.

2. **Competency 2 — Arrays & Structured Data (5 Marks)**:
   - Define \`struct Vitals { int heartRate; int spO2; int systolicBP; };\`
   - Define \`struct Patient { int id; char name[32]; int age; struct Vitals vitals; int triagePriority; };\`
   - Maintain and display patient arrays sorted by priority level.

3. **Competency 3 — Pointers & Functions (5 Marks)**:
   - Write pointer-driven record mutators \`void updateVitalsByRef(struct Patient *p, int hr, int spo2, int bp);\`
   - Write dynamic search functions \`struct Patient* findPatientById(struct Patient *list, int count, int id);\`

4. **Competency 4 — System Integration & Memory Management (5 Marks)**:
   - Provide a modular interactive console dispatcher (\`ADD\`, \`LIST\`, \`STATS\`).
   - Ensure zero memory leaks with clean pointer hygiene.`,
          rubricJson: JSON.stringify([
            { competency: 'Syntax & Branching Logic (Triage Rules)', maxMarks: 5 },
            { competency: 'Data Structuring (Patient Records & Vitals)', maxMarks: 5 },
            { competency: 'Pointers & Dynamic Memory (Reference Mutators)', maxMarks: 5 },
            { competency: 'System Integration, Modularity & Error Handling', maxMarks: 5 },
          ]),
          starterCode: `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\n// 1. DATA STRUCTURES\nstruct Vitals {\n    int heartRate;\n    int spO2;\n    int systolicBP;\n};\n\nstruct Patient {\n    int id;\n    char name[32];\n    int age;\n    struct Vitals vitals;\n    int triagePriority; // 1 = Critical, 2 = Urgent, 3 = Standard\n};\n\n// 2. COMPETENCY FUNCTIONS\nint calculateTriageLevel(int hr, int spo2, int bp) {\n    if (spo2 < 90 || hr > 140 || bp < 90) return 1;\n    if ((spo2 >= 90 && spo2 <= 94) || (hr >= 100 && hr <= 140)) return 2;\n    return 3;\n}\n\nvoid updateVitalsByRef(struct Patient *p, int hr, int spo2, int bp) {\n    if (!p) return;\n    p->vitals.heartRate = hr;\n    p->vitals.spO2 = spo2;\n    p->vitals.systolicBP = bp;\n    p->triagePriority = calculateTriageLevel(hr, spo2, bp);\n}\n\nint main() {\n    printf("--- City General Hospital Triage Console ---\\n");\n    // TODO: Implement interactive patient queue management\n    return 0;\n}\n`,
          expectedTimeMin: 45,
          expectedTimeMax: 120,
        },
      });
      console.log('⚡ Seeded Capstone Mini-Project.');
    }

    // 6. Ensure Core Admins and Canonical Section Exist in Database
    const adminHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'AdminPassword123!', 10);

    // Purge deprecated template placeholder admin account permanently
    await prisma.user.deleteMany({
      where: { email: 'admin@logicq.io' },
    }).catch(() => {});

    const coreAdmins = [
      {
        email: 'logicqarena@gmail.com',
        username: 'logicqarena',
        fullName: 'LogicQ Arena Admin',
        displayName: 'LogicQ Arena (Admin)',
      },
      {
        email: 'hariprasathset@sanjivani.edu.in',
        username: 'hariprasath',
        fullName: 'Dr. Hari Prasath',
        displayName: 'Dr. Hari Prasath (Admin)',
      },
    ];

    let primaryAdminUser: any = null;
    for (const adm of coreAdmins) {
      const u = await prisma.user.upsert({
        where: { email: adm.email },
        update: { role: 'ADMIN', profileComplete: true },
        create: {
          username: adm.username,
          email: adm.email,
          fullName: adm.fullName,
          displayName: adm.displayName,
          role: 'ADMIN',
          passwordHash: adminHash,
          college: 'Sanjivani University',
          department: 'CSE',
          profileComplete: true,
        },
      });
      if (!primaryAdminUser) primaryAdminUser = u;
    }
    console.log('⚡ Core Super Admin accounts verified & synced.');

    // 5. Seed Walkthrough Accounts (faculty@logicq.io & student@logicq.io)
    await prisma.user.upsert({
      where: { email: 'faculty@logicq.io' },
      update: { role: 'FACULTY', profileComplete: true },
      create: {
        username: 'faculty_demo',
        email: 'faculty@logicq.io',
        fullName: 'Prof. Demo Faculty (Walkthrough)',
        displayName: 'Prof. Demo Faculty',
        role: 'FACULTY',
        passwordHash: adminHash,
        college: 'Sanjivani University',
        department: 'Integrated M.Tech',
        profileComplete: true,
      },
    });

    const studentPassHash = await bcrypt.hash('StudentDemo123!', 10);
    const demoStudent = await prisma.user.upsert({
      where: { email: 'student@logicq.io' },
      update: {
        role: 'STUDENT',
        prn: '2026STUD0001',
        profileComplete: true,
        accountState: 'ACTIVE',
        isBanned: false,
      },
      create: {
        username: 'student_demo',
        email: 'student@logicq.io',
        prn: '2026STUD0001',
        fullName: 'Demo Student (Walkthrough)',
        displayName: 'Demo Student',
        role: 'STUDENT',
        passwordHash: studentPassHash,
        college: 'Sanjivani University',
        department: 'CSE',
        year: 'SY',
        division: 'A',
        profileComplete: true,
        accountState: 'ACTIVE',
        isBanned: false,
      },
    });
    await prisma.prnIndex.upsert({
      where: { prn: '2026STUD0001' },
      create: { prn: '2026STUD0001', userId: demoStudent.id },
      update: { userId: demoStudent.id },
    }).catch(() => {});
    console.log('⚡ Walkthrough demo student (student@logicq.io) seeded successfully.');

    // Active purge: permanently eliminate legacy demo section (LQ-DC85) so it never revives
    try {
      const purged = await prisma.section.deleteMany({
        where: {
          OR: [
            { joinCode: 'LQ-DC85' },
            { sectionName: 'Div A - Computer Science' },
            { joinToken: '20e4db09-fe9a-47ab-a034-57b11e49a02f' },
            { description: 'Official academic section for B.Tech CSE' },
          ],
        },
      });
      if (purged.count > 0) {
        console.log(`🧹 Purged ${purged.count} legacy demo section(s) [LQ-DC85]. Zero auto-seed sections will be recreated.`);
      }
    } catch (purgeErr) {
      console.warn('Note: Legacy section purge check completed:', purgeErr);
    }
  } catch (error) {
    console.error('⚠️ Warning: Auto-seed encountered an error (continuing boot):', error);
  }
}
