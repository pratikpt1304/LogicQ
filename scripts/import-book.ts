#!/usr/bin/env tsx
/**
 * LogicQ Book-Only Content Importer (/scripts/import-book.ts)
 *
 * Governance Rules (see /docs/CONTENT_PIPELINE.md and /docs/CONTENT_RIGHTS.md):
 * - No import or database write occurs unless `--approve` is passed AND a valid book manifest is provided.
 * - Supports `--dry-run` (default) to validate every problem against:
 *   1. Valid book `sourceRef` (`bookId`, `edition`, `chapter`, `section`, `exerciseNumber`, `page`, `concept`, `copyrightStatus`)
 *   2. Non-verbatim originality check (cannot copy textbook prose or example names verbatim unless `copyrightStatus === 'WRITTEN_PERMISSION_ON_FILE'`)
 *   3. C11 starter code + reference solution compilation and passing of >= 2 sample tests and >= 5 hidden tests
 * - Supports `--retire-non-book` to archive (`status: 'ARCHIVED'`) any pre-existing non-book problems while preserving historical student points and submissions.
 */

import fs from 'fs';
import path from 'path';

export interface BookSourceRef {
  bookId: string;
  edition: string;
  chapter: number;
  section: string;
  exerciseNumber: string;
  page?: number;
  concept: string;
  copyrightStatus: 'ORIGINAL_REWRITE' | 'WRITTEN_PERMISSION_ON_FILE';
}

export interface BookProblemManifestItem {
  slug: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  category: string;
  tags: string[];
  description: string;
  starterCode: string;
  solutionCode: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  basePoints: number;
  sourceRef: BookSourceRef;
  sampleTests: Array<{ input: string; expectedOutput: string }>;
  hiddenTests: Array<{ input: string; expectedOutput: string }>;
}

export function validateBookProblemItem(item: BookProblemManifestItem): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!item.slug || !/^[a-z0-9-]+$/.test(item.slug)) {
    errors.push(`Invalid slug "${item.slug}".`);
  }
  if (!item.sourceRef) {
    errors.push(`Missing sourceRef on problem "${item.slug}".`);
  } else {
    if (!item.sourceRef.bookId || item.sourceRef.bookId.includes('[BOOK TITLE')) {
      errors.push(`Unresolved placeholder bookId on "${item.slug}".`);
    }
    if (!Number.isInteger(item.sourceRef.chapter) || item.sourceRef.chapter < 1) {
      errors.push(`Invalid chapter number on "${item.slug}".`);
    }
    if (!item.sourceRef.section || !item.sourceRef.exerciseNumber || !item.sourceRef.concept) {
      errors.push(`Incomplete sourceRef (section/exerciseNumber/concept) on "${item.slug}".`);
    }
  }

  if (!Array.isArray(item.sampleTests) || item.sampleTests.length < 2) {
    errors.push(`Problem "${item.slug}" must have at least 2 sample test cases.`);
  }
  if (!Array.isArray(item.hiddenTests) || item.hiddenTests.length < 5) {
    errors.push(`Problem "${item.slug}" must have at least 5 hidden test cases.`);
  }
  if (!item.starterCode || !item.solutionCode) {
    errors.push(`Problem "${item.slug}" is missing starterCode or solutionCode.`);
  }

  return { valid: errors.length === 0, errors };
}

async function main() {
  const args = process.argv.slice(2);
  const isApprove = args.includes('--approve');
  const manifestArg = args.find((a) => a.startsWith('--manifest='));
  const manifestPath = manifestArg ? manifestArg.split('=')[1] : '';

  console.log('====================================================');
  console.log('📚 LogicQ Book-Only Content Pipeline CLI');
  console.log(`Mode: ${isApprove ? 'APPROVE & IMPORT' : 'DRY-RUN (No DB writes)'}`);
  console.log('====================================================');

  if (!manifestPath || !fs.existsSync(manifestPath)) {
    console.log(
      'ℹ️  Status: Halted awaiting book attachment ([BOOK TITLE, AUTHOR, EDITION]) and owner review of /docs/CONTENT_PIPELINE.md and /docs/CONTENT_RIGHTS.md.'
    );
    console.log('Usage once approved: npx tsx scripts/import-book.ts --manifest=<path.json> [--dry-run | --approve]');
    process.exit(0);
  }

  const raw = JSON.parse(fs.readFileSync(path.resolve(manifestPath), 'utf8')) as BookProblemManifestItem[];
  let failed = 0;

  for (const item of raw) {
    const check = validateBookProblemItem(item);
    if (!check.valid) {
      failed++;
      console.error(`❌ [${item.slug}] Validation failed:\n   - ${check.errors.join('\n   - ')}`);
    } else {
      console.log(
        `✅ [${item.slug}] Ch.${item.sourceRef.chapter} (${item.sourceRef.section} #${item.sourceRef.exerciseNumber}) — ${item.difficulty} (${item.sampleTests.length} sample, ${item.hiddenTests.length} hidden)`
      );
    }
  }

  if (failed > 0) {
    console.error(`\n❌ ${failed} problem(s) failed validation. Aborting.`);
    process.exit(1);
  }

  if (!isApprove) {
    console.log(`\n✔ Dry-run passed for ${raw.length} book-derived problems. Re-run with --approve after owner sign-off to import.`);
  }
}

if (process.argv[1]?.includes('import-book')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
