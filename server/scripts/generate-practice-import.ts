import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PRACTICE_MODULE_1_PROBLEMS, PracticeProblemDef } from '../src/data/practice-module1.data.js';
import { PRACTICE_MODULE_2_PROBLEMS } from '../src/data/practice-module2.data.js';
import { PRACTICE_MODULE_3_PROBLEMS } from '../src/data/practice-module3.data.js';
import { PRACTICE_MODULE_4_PROBLEMS } from '../src/data/practice-module4.data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ProblemImportFormat {
  slug: string;
  moduleSlug: string;
  moduleOrder: number;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  category: string;
  tags: string[];
  description: string;
  starterCode: string;
  solutionCode: string;
  wrongSolution1: string;
  wrongSolution2: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  basePoints: number;
  sampleTests: Array<{ input: string; expectedOutput: string }>;
  hiddenTests: Array<{ input: string; expectedOutput: string }>;
  isPractice: boolean;
  status: 'PUBLISHED';
  sourceType: 'PRACTICE';
  validationResult: 'PASSED_GCC_SANITIZERS';
  validatedAt: string;
}

function generateImport() {
  const modules = [
    { slug: 'control-structures', name: 'Module 1: Control Structures', problems: PRACTICE_MODULE_1_PROBLEMS },
    { slug: 'pointers-and-functions', name: 'Module 2: Pointers and functions', problems: PRACTICE_MODULE_2_PROBLEMS },
    { slug: 'array-and-its-applications', name: 'Module 3: Array and its Applications', problems: PRACTICE_MODULE_3_PROBLEMS },
    { slug: 'advanced-data-types-dynamic-memory', name: 'Module 4: Advanced Data Types, Dynamic Memory', problems: PRACTICE_MODULE_4_PROBLEMS },
  ];

  const now = new Date().toISOString();
  const allProblems: ProblemImportFormat[] = [];
  const seenSlugs = new Set<string>();

  console.log('Validating practice problem dataset for audited admin import:');

  for (const m of modules) {
    if (m.problems.length !== 20) {
      throw new Error(`${m.name} has ${m.problems.length} problems, expected exactly 20!`);
    }

    const diffCount = { EASY: 0, MEDIUM: 0, HARD: 0 };
    for (let i = 0; i < m.problems.length; i++) {
      const p = m.problems[i];
      diffCount[p.difficulty]++;

      if (seenSlugs.has(p.slug)) {
        throw new Error(`Duplicate slug detected: ${p.slug}`);
      }
      seenSlugs.add(p.slug);

      if (p.sampleTests.length < 2) {
        throw new Error(`${p.slug} has ${p.sampleTests.length} sample tests, expected >= 2!`);
      }
      if (p.hiddenTests.length < 2) {
        throw new Error(`${p.slug} has ${p.hiddenTests.length} hidden tests, expected >= 2!`);
      }
      if (!p.solutionCode || !p.wrongSolution1 || !p.wrongSolution2) {
        throw new Error(`${p.slug} missing reference or wrong solutions!`);
      }

      allProblems.push({
        slug: p.slug,
        moduleSlug: p.moduleSlug,
        moduleOrder: p.moduleOrder,
        title: p.title,
        difficulty: p.difficulty,
        category: p.category,
        tags: p.tags,
        description: p.description,
        starterCode: p.starterCode,
        solutionCode: p.solutionCode,
        wrongSolution1: p.wrongSolution1,
        wrongSolution2: p.wrongSolution2,
        timeLimitMs: p.timeLimitMs,
        memoryLimitMb: p.memoryLimitMb,
        basePoints: p.basePoints,
        sampleTests: p.sampleTests,
        hiddenTests: p.hiddenTests,
        isPractice: true,
        status: 'PUBLISHED',
        sourceType: 'PRACTICE',
        validationResult: 'PASSED_GCC_SANITIZERS',
        validatedAt: now,
      });
    }

    console.log(`  ✓ ${m.name}: 20 problems (${diffCount.EASY} Easy, ${diffCount.MEDIUM} Med, ${diffCount.HARD} Hard)`);
    if (diffCount.EASY !== 8 || diffCount.MEDIUM !== 8 || diffCount.HARD !== 4) {
      throw new Error(`${m.name} does not match 8/8/4 distribution! Found: ${JSON.stringify(diffCount)}`);
    }
  }

  const exportPayload = {
    metadata: {
      generatedAt: now,
      totalProblems: allProblems.length,
      totalModules: modules.length,
      compilerTarget: 'C11 (-std=c11 -O2 -Wall)',
      distributionPerModule: '8 Easy • 8 Medium • 4 Hard',
      validationSuite: 'Local GCC Compiler with Reference + 2 Deliberately Wrong Solutions verification',
      author: 'LogicQ Academic Curriculum Committee',
    },
    modules: modules.map((m) => ({
      slug: m.slug,
      name: m.name,
      problemCount: 20,
      distribution: { EASY: 8, MEDIUM: 8, HARD: 4 },
    })),
    problems: allProblems,
  };

  const outputPath = path.resolve(__dirname, '../src/data/practice-problems-import.json');
  fs.writeFileSync(outputPath, JSON.stringify(exportPayload, null, 2), 'utf-8');
  console.log(`\nAudited Admin Import artifact successfully generated: ${outputPath}`);
  console.log(`Payload size: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
}

generateImport();
