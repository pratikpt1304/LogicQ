import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../client/dist');

const FORBIDDEN_PATTERNS = [
  { pattern: 'localhost:5000', reason: 'Dev backend URL must never leak into production bundle' },
  { pattern: '127.0.0.1:5000', reason: 'Dev loopback URL must never leak into production bundle' },
  { pattern: 'cdn.jsdelivr.net', reason: 'Monaco and all assets must be bundled locally without CDN calls' },
  { pattern: 'socket.io', reason: 'Socket.IO client was removed; Firebase Hosting cannot serve WebSockets' },
];

function walkFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(fullPath));
    } else if (/\.(js|css|html|webmanifest|json)$/i.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

if (!fs.existsSync(distDir)) {
  console.error(`❌ Build directory not found at ${distDir}. Run "npm --prefix client run build" first.`);
  process.exit(1);
}

const files = walkFiles(distDir);
let violations = 0;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  for (const { pattern, reason } of FORBIDDEN_PATTERNS) {
    if (content.includes(pattern)) {
      console.error(`❌ Forbidden string "${pattern}" found in ${path.relative(distDir, file)} (${reason})`);
      violations++;
    }
  }
}

if (violations > 0) {
  console.error(`❌ Bundle audit failed with ${violations} violation(s).`);
  process.exit(1);
}

console.log(`✅ Bundle audit passed across ${files.length} built files (0 forbidden URLs or Socket.IO references).`);
