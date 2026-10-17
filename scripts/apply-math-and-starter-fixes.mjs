import fs from 'fs';
import path from 'path';
import { sanitizeMathInStatement } from './sanitize-math.mjs';

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

for (const filePath of targetFiles) {
  if (!fs.existsSync(filePath)) continue;
  console.log(`Processing ${filePath}...`);
  let content = fs.readFileSync(filePath, 'utf8');

  if (filePath.endsWith('.json')) {
    const data = JSON.parse(content);
    const probList = Array.isArray(data) ? data : (data.problems || []);
    for (const prob of probList) {
      if (prob.description) {
        prob.description = sanitizeMathInStatement(prob.description);
      }
      // Easy problem starter template cleanup
      if (prob.difficulty === 'EASY' && prob.starterCode) {
        // Replace long long with int if standard integer range
        if (prob.starterCode.includes('if (scanf(') || prob.starterCode.includes('long long')) {
          if (prob.slug === 'practice-c1-largest-of-three') {
            prob.starterCode = `#include <stdio.h>

int main() {
    int a, b, c;
    scanf("%d %d %d", &a, &b, &c);
    
    // TODO: Determine maximum among a, b, c and print it
    
    return 0;
}`;
          } else if (prob.slug === 'practice-c1-arithmetic-calculator-switch') {
            prob.starterCode = `#include <stdio.h>

int main() {
    int x, y;
    char op;
    scanf("%d %c %d", &x, &op, &y);
    
    // TODO: Evaluate using switch(op) and print result (or ERROR for division by 0)
    
    return 0;
}`;
          } else if (prob.slug === 'practice-c1-sum-of-digits-loop') {
            prob.starterCode = `#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    scanf("%d", &n);
    
    // TODO: Compute and print the sum of digits of n
    
    return 0;
}`;
          } else {
            // General beginner-friendly simplification for Easy
            prob.starterCode = prob.starterCode
              .replace(/if\s*\(scanf\([^)]+\)\s*!=\s*\d+\)\s*return 0;?/g, (match) => {
                const scanfPart = match.match(/scanf\([^)]+\)/);
                return scanfPart ? `${scanfPart[0]};` : match;
              })
              .replace(/long long\s+([a-zA-Z0-9_,\s]+);/g, (match, vars) => {
                // If variables are just a, b, c, etc., simplify to int for easy
                return `int ${vars};`;
              })
              .replace(/%lld/g, '%d');
          }
        }
      }
      // Ensure no stray ,m or trailing garbage in starterCode
      if (prob.starterCode) {
        prob.starterCode = prob.starterCode.replace(/,m\b/g, '').trimEnd() + '\n';
      }
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } else {
    // TypeScript files
    // 1. Sanitize description blocks
    content = content.replace(/description:\s*`([\s\S]*?)`,/g, (fullMatch, descText) => {
      const cleaned = sanitizeMathInStatement(descText);
      return `description: \`${cleaned}\`,`;
    });

    // 2. Specific starterCode cleanups for Easy problems in Module 1
    content = content.replace(
      /slug:\s*'practice-c1-largest-of-three',[\s\S]*?starterCode:\s*`[\s\S]*?`,/g,
      (match) => {
        return match.replace(/starterCode:\s*`[\s\S]*?`,/, `starterCode: \`#include <stdio.h>

int main() {
    int a, b, c;
    scanf("%d %d %d", &a, &b, &c);
    
    // TODO: Determine maximum among a, b, c and print it
    
    return 0;
}\`,`);
      }
    );

    content = content.replace(
      /slug:\s*'practice-c1-arithmetic-calculator-switch',[\s\S]*?starterCode:\s*`[\s\S]*?`,/g,
      (match) => {
        return match.replace(/starterCode:\s*`[\s\S]*?`,/, `starterCode: \`#include <stdio.h>

int main() {
    int x, y;
    char op;
    scanf("%d %c %d", &x, &op, &y);
    
    // TODO: Evaluate using switch(op) and print result (or ERROR for division by 0)
    
    return 0;
}\`,`);
      }
    );

    content = content.replace(
      /slug:\s*'practice-c1-sum-of-digits-loop',[\s\S]*?starterCode:\s*`[\s\S]*?`,/g,
      (match) => {
        return match.replace(/starterCode:\s*`[\s\S]*?`,/, `starterCode: \`#include <stdio.h>
#include <stdlib.h>

int main() {
    int n;
    scanf("%d", &n);
    
    // TODO: Compute and print the sum of digits of n
    
    return 0;
}\`,`);
      }
    );

    // 3. Remove any accidental ,m or trailing text glued onto a line
    content = content.replace(/,m\b/g, '');

    fs.writeFileSync(filePath, content, 'utf8');
  }
}

console.log('Math and starter templates update finished.');
