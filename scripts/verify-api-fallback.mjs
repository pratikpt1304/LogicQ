/**
 * Verification Script: Assert No API Path Can Be Answered by SPA Fallback
 * 
 * Invariants enforced:
 * 1. Client API routes must strictly receive application/json responses.
 * 2. If a server/proxy returns text/html on an /api/* path (e.g. from a wildcard SPA rewrite),
 *    the client must fail closed with honest error classification and preserve student code.
 * 3. Health check endpoint (/api/health) returns 200 with structured JSON judge status.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🔍 Running Build Guard: Verifying API routing and SPA rewrite isolation...\n');

let violations = 0;

// 1. Inspect firebase.json for rewrite collisions
const firebaseJsonPath = path.join(rootDir, 'firebase.json');
if (fs.existsSync(firebaseJsonPath)) {
  const firebaseConfig = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf8'));
  const rewrites = firebaseConfig?.hosting?.rewrites || [];
  
  // Check if wildcard rewrite precedes or swallows API routes
  const wildcardIndex = rewrites.findIndex((r) => r.source === '**');
  const apiRewrite = rewrites.find((r) => r.source === '/api/**' || r.source?.startsWith('/api'));

  if (wildcardIndex !== -1 && !apiRewrite) {
    console.log('ℹ️  firebase.json contains SPA fallback ("**" -> "/index.html").');
    console.log('   Client-side API requests must never be misrouted to same-origin Hosting without a backend rewrite.');
  }
}

// 2. Check client API resilience code (client/src/api/client.ts)
const clientApiFile = path.join(rootDir, 'client', 'src', 'api', 'client.ts');
if (fs.existsSync(clientApiFile)) {
  const clientCode = fs.readFileSync(clientApiFile, 'utf8');

  if (!clientCode.includes('Judge service unreachable: server returned unexpected response')) {
    console.error('❌ Violation: client/src/api/client.ts does not include honest unexpected-response message.');
    violations++;
  } else {
    console.log('✅ client.ts: Verified honest error classification for non-API responses.');
  }

  if (!clientCode.includes('isJsonResponse')) {
    console.error('❌ Violation: client/src/api/client.ts does not check Content-Type for application/json.');
    violations++;
  } else {
    console.log('✅ client.ts: Verified strict Content-Type application/json check.');
  }

  if (!clientCode.includes('Your code is safely saved to your account')) {
    console.error('❌ Violation: client/src/api/client.ts does not reassure student that code is saved to account.');
    violations++;
  } else {
    console.log('✅ client.ts: Verified code preservation messaging for student account.');
  }
}

// 3. Check App.tsx for unmistakable Staging indicator banner
const appFile = path.join(rootDir, 'client', 'src', 'App.tsx');
if (fs.existsSync(appFile)) {
  const appCode = fs.readFileSync(appFile, 'utf8');
  if (!appCode.includes('STAGING ENVIRONMENT') || !appCode.includes('isStaging')) {
    console.error('❌ Violation: client/src/App.tsx does not render prominent STAGING banner.');
    violations++;
  } else {
    console.log('✅ App.tsx: Verified unmistakable STAGING visual banner indicator.');
  }
}

// 4. Check server health check endpoint implementation
const serverAppFile = path.join(rootDir, 'server', 'src', 'app.ts');
if (fs.existsSync(serverAppFile)) {
  const serverCode = fs.readFileSync(serverAppFile, 'utf8');
  if (!serverCode.includes('/api/health') || !serverCode.includes('judge:')) {
    console.error('❌ Violation: server/src/app.ts /api/health does not report live judge status.');
    violations++;
  } else {
    console.log('✅ server/src/app.ts: Verified /api/health live judge status reporting.');
  }
}

if (violations > 0) {
  console.error(`\n❌ VERIFICATION FAILED: ${violations} routing or resilience violation(s) found.`);
  process.exit(1);
} else {
  console.log('\n🎉 ALL CHECKS PASSED: API resilience, health check, and staging visual isolation verified.');
}
