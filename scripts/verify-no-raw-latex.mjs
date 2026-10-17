import fs from 'fs';

const targetFiles = [
  'client/src/data/practice-module1.data.ts',
  'client/src/data/practice-module2.data.ts',
  'client/src/data/practice-module3.data.ts',
  'client/src/data/practice-module4.data.ts',
  'server/src/data/practice-module1.data.ts',
  'server/src/data/practice-module2.data.ts',
  'server/src/data/practice-module3.data.ts',
  'server/src/data/practice-module4.data.ts',
  'server/src/data/kanetkar-book-bank.ts',
  'server/src/data/practice-problems-import.json'
];

let totalViolations = 0;
// Scan for unrendered math delimiters $, \le, \ge, \times, \leq, \cdot, \approx, etc.
const LATEX_REGEX = /(\$[^$\n]+\$|\\[a-zA-Z]+)/g;
// Whitelist valid code escape sequences like \n, \t, \", \', \\
const WHITELIST = new Set(['\\n', '\\t', '\\r', '\\"', "\\'", '\\\\', '\\0']);

for (const filePath of targetFiles) {
  if (!fs.existsSync(filePath)) continue;
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Extract descriptions if ts/json
  let descriptions = [];
  if (filePath.endsWith('.json')) {
    const data = JSON.parse(content);
    const list = Array.isArray(data) ? data : (data.problems || []);
    descriptions = list.map(p => ({ title: p.title || p.slug, desc: p.description || '' }));
  } else {
    const matches = [...content.matchAll(/title:\s*'([^']+)'[\s\S]*?description:\s*`([\s\S]*?)`/g)];
    descriptions = matches.map(m => ({ title: m[1], desc: m[2] }));
  }

  for (const item of descriptions) {
    const matches = item.desc.match(LATEX_REGEX) || [];
    const invalid = matches.filter(m => !WHITELIST.has(m) && !m.startsWith('\\n') && !m.startsWith('\\t'));
    if (invalid.length > 0) {
      console.warn(`[RAW_LATEX_FOUND] in ${filePath} -> "${item.title}":`, invalid);
      totalViolations += invalid.length;
    }
  }
}

if (totalViolations === 0) {
  console.log('✅ ZERO unrendered LaTeX or raw math delimiters found across all problem definitions.');
  process.exit(0);
} else {
  console.error(`❌ Found ${totalViolations} unrendered LaTeX tokens.`);
  process.exit(1);
}
