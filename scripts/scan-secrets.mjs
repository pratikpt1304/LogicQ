import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const IGNORED_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'private',
  '.firebase',
  '.agents',
  'test-results',
]);

const SECRET_PATTERNS = [
  /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/,
  /ghp_[a-zA-Z0-9]{36}/,
  /github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}/,
  /AIzaSy[0-9A-Za-z_-]{33}/,
  /xox[baprs]-[0-9a-zA-Z]{10,48}/,
  /sk_live_[0-9a-zA-Z]{24}/,
];

let violations = 0;

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile()) {
      if ((entry.name.startsWith('.env') && entry.name !== '.env.example') || entry.name.endsWith('.db') || entry.name.endsWith('.png') || entry.name.endsWith('.jpg') || entry.name.endsWith('.svg') || entry.name.endsWith('.pdf')) {
        continue;
      }
      const text = fs.readFileSync(fullPath, 'utf8');
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.test(text)) {
          console.error(`🚨 Possible secret match in ${path.relative(ROOT, fullPath)}: ${pattern}`);
          violations++;
        }
      }
    }
  }
}

scanDir(ROOT);

if (violations === 0) {
  console.log('✅ Clean secret scan: Zero API keys, private keys, or tokens detected in repo files.');
  process.exit(0);
} else {
  console.error(`❌ Found ${violations} potential secret matches.`);
  process.exit(1);
}
