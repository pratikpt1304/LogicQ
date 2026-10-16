import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const source = `
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
int main() {
    size_t sz = 30 * 1024 * 1024;
    char *p = (char *)malloc(sz);
    if (p) {
        for (size_t i = 0; i < sz; i += 4096) {
            p[i] = (char)(i & 0xFF);
        }
        printf("DONE %d\\n", (int)p[sz - 4096]);
    }
    return 0;
}
`;

fs.writeFileSync('scripts/memtest.c', source, 'utf8');
execFileSync('gcc', ['-O2', 'scripts/memtest.c', '-o', 'scripts/memtest.exe']);

const runnerExe = path.resolve('src/judge/win-sandbox-runner.exe');
const targetExe = path.resolve('scripts/memtest.exe');
const workDir = path.resolve('scripts');

console.log('Running runnerExe:', runnerExe);
console.log('TargetExe:', targetExe);

try {
  const out = execFileSync(runnerExe, ['3000', '64', workDir, targetExe, 'TOKEN123'], {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  console.log('STDOUT:', out);
} catch (err: any) {
  console.log('STDOUT:', err.stdout);
  console.log('STDERR:', err.stderr);
}
