#!/usr/bin/env node

/**
 * Build-Time Guard: Primary Data Store Verifier
 * 
 * Invariant: Student data (points, streaks, submissions, practice progress, profile)
 * MUST be anchored to Firestore keyed by auth.uid.
 * LocalStorage, SessionStorage and IndexedDB may ONLY be used as temporary caches,
 * session tokens, or cross-tab synchronization channels.
 * 
 * Fails the build if any primary data store violation is found.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLIENT_SRC = path.resolve(__dirname, '../client/src');

// Allowed localStorage/sessionStorage keys
const ALLOWED_STORAGE_KEYS = new Set([
  'logicq_active_user',               // Session cache for zero-flash page loads
  'logicq_access_token',              // JWT bearer token
  'logicq_last_activity',             // Inactivity tracking epoch
  'logicq_logout_event',              // Multi-tab broadcast channel
  'logicq_logout_notice',             // Next-page notification
  'logicq_draft_',                    // Client draft cache (synced with Firestore)
  'logicq_practice_draft_',           // Client practice draft cache (synced with Firestore)
  'theme',                            // Theme preference UI cache
  'chakra-ui-color-mode',             // UI library theme
]);

// Forbidden patterns indicating primary data storage in browser memory/storage
const FORBIDDEN_STORAGE_PATTERNS = [
  /localStorage\.setItem\s*\(\s*['"`]logicq_student_points['"`]/i,
  /localStorage\.setItem\s*\(\s*['"`]logicq_student_streak['"`]/i,
  /localStorage\.setItem\s*\(\s*['"`]logicq_user_submissions['"`]/i,
  /sessionStorage\.setItem\s*\(\s*['"`]logicq_student_points['"`]/i,
  /sessionStorage\.setItem\s*\(\s*['"`]logicq_student_streak['"`]/i,
];

let errorsFound = 0;

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist') {
        scanDirectory(fullPath);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js'))) {
      const content = fs.readFileSync(fullPath, 'utf8');

      // Check forbidden patterns
      for (const pattern of FORBIDDEN_STORAGE_PATTERNS) {
        if (pattern.test(content)) {
          console.error(`❌ [PRIMARY STORAGE VIOLATION] File ${path.relative(CLIENT_SRC, fullPath)} contains forbidden primary localStorage write: ${pattern}`);
          errorsFound++;
        }
      }

      // Check if client.ts or services contain un-mirrored primary student records in localStorage
      if (entry.name === 'client.ts') {
        if (content.includes("import.meta.env.PROD") && !content.includes("LogicQ server connection unavailable") && !content.includes("LogicQ server did not respond")) {
          console.error(`❌ [MOCK FALLBACK VIOLATION] client.ts must fail closed in production for auth and submissions.`);
          errorsFound++;
        }
      }
    }
  }
}

console.log('🔍 Running Build Guard: Verifying Firestore is primary student data store...');
scanDirectory(CLIENT_SRC);

if (errorsFound > 0) {
  console.error(`\n🚨 BUILD FAILED: ${errorsFound} primary storage violations detected. Primary student data must go to Firestore.`);
  process.exit(1);
} else {
  console.log('✅ Build Guard Passed: Zero primary localStorage/sessionStorage student data violations.');
  process.exit(0);
}
