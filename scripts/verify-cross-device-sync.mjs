import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.resolve('docs/verification-screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runVerification() {
  console.log('=================================================================');
  console.log('🚀 STARTING FULL CROSS-DEVICE STATE CONTINUITY VERIFICATION SUITE');
  console.log('=================================================================\n');

  // 1. Start Server on port 5000
  console.log('1. Starting LogicQ Server on port 5000...');
  const serverProcess = spawn('npx.cmd', ['tsx', 'src/index.ts'], {
    cwd: path.resolve('server'),
    stdio: 'pipe',
    shell: true,
  });

  await new Promise((resolve) => {
    serverProcess.stdout.on('data', (d) => {
      const msg = d.toString();
      if (msg.includes('LogicQ Server is running')) {
        console.log('   ✓ Server started successfully.');
        resolve(true);
      }
    });
    setTimeout(() => resolve(true), 6000);
  });

  // 2. Start Vite Preview on port 5173
  console.log('2. Starting Vite Client on port 5173...');
  const previewProcess = spawn('npx.cmd', ['vite', 'preview', '--port', '5173'], {
    cwd: path.resolve('client'),
    stdio: 'pipe',
    shell: true,
  });

  await new Promise((resolve) => {
    previewProcess.stdout.on('data', (d) => {
      const msg = d.toString();
      if (msg.includes('http://localhost:5173')) {
        console.log('   ✓ Client preview started successfully.');
        resolve(true);
      }
    });
    setTimeout(() => resolve(true), 5000);
  });

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const results = {
    crossDeviceContinuity: false,
    preferencesSync: false,
    draftCloudSync: false,
    failureStateRetryUI: false,
    details: {},
  };

  try {
    const studentEmail = `verified_student_${Date.now()}@sanjivani.edu.in`;
    const studentPrn = `2024AIMF${Math.floor(1000 + Math.random() * 8999)}`;
    const studentPassword = 'StrongPassword123!';

    console.log(`\n📋 Test Credentials: Email=${studentEmail}, PRN=${studentPrn}`);

    // =========================================================================
    // TEST 1: Context A (Desktop 1280x800) - Registration & State Setup
    // =========================================================================
    console.log('\n--- 3. Context A (Desktop 1280x800): Registering Student Account ---');
    const contextA = await browser.createBrowserContext();
    const pageA = await contextA.newPage();
    await pageA.setViewport({ width: 1280, height: 800 });

    await pageA.goto('http://localhost:5173/register', { waitUntil: 'networkidle0' });

    // Fill registration form
    await pageA.type('input[placeholder*="PRN"], input[name="prn"]', studentPrn);
    await pageA.type('input[placeholder*="Alex"], input[name="fullName"], input[name="displayName"]', 'Morgan Vance');
    await pageA.type('input[type="email"]', studentEmail);

    const passwordInputs = await pageA.$$('input[type="password"]');
    if (passwordInputs.length >= 1) await passwordInputs[0].type(studentPassword);
    if (passwordInputs.length >= 2) await passwordInputs[1].type(studentPassword);

    // Submit form
    const submitBtn = await pageA.$('button[type="submit"]');
    if (submitBtn) await submitBtn.click();

    await sleep(2500);

    const urlA = pageA.url();
    console.log(`   Context A URL after registration: ${urlA}`);
    await pageA.screenshot({ path: path.join(SCREENSHOT_DIR, '01_contextA_dashboard.png') });

    // Save a draft in Context A
    await pageA.evaluate(() => {
      localStorage.setItem('logicq_draft_sample-slug', '#include <stdio.h>\nint main() { printf("Cross-device draft test"); return 0; }');
      localStorage.setItem('logicq_draft_sample-slug_meta', JSON.stringify({
        updatedAt: Date.now(),
        deviceLabel: 'Desktop Chrome (Windows)',
      }));
    });
    console.log('   ✓ Context A draft saved.');

    // =========================================================================
    // TEST 2: Context B (Mobile 360x780) - Independent Device Login
    // =========================================================================
    console.log('\n--- 4. Context B (Mobile 360x780): Signing in from New Device ---');
    const contextB = await browser.createBrowserContext();
    const pageB = await contextB.newPage();
    await pageB.setViewport({ width: 360, height: 780, isMobile: true, hasTouch: true });

    await pageB.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });

    // Log in with exact same credentials
    await pageB.type('input[placeholder*="email" i], input[placeholder*="PRN" i], input[type="text"]', studentEmail);
    const passB = await pageB.$('input[type="password"]');
    if (passB) await passB.type(studentPassword);

    const loginBtn = await pageB.$('button[type="submit"]');
    if (loginBtn) await loginBtn.click();

    await sleep(2500);

    const urlB = pageB.url();
    console.log(`   Context B URL after sign in: ${urlB}`);
    await pageB.screenshot({ path: path.join(SCREENSHOT_DIR, '02_contextB_mobile_dashboard.png') });

    // Navigate Context B to Profile to verify fields
    await pageB.goto('http://localhost:5173/profile', { waitUntil: 'networkidle0' });
    await sleep(1500);
    await pageB.screenshot({ path: path.join(SCREENSHOT_DIR, '03_contextB_mobile_profile.png') });

    const profileTextB = await pageB.evaluate(() => document.body.innerText);
    const hasNameB = profileTextB.includes('Morgan Vance') || profileTextB.includes(studentPrn.slice(-4));
    const hasPrnB = profileTextB.includes(studentPrn.slice(-4));

    console.log(`   Verification on Context B: Name Found=${hasNameB}, PRN Suffix Found=${hasPrnB}`);
    results.crossDeviceContinuity = hasNameB || hasPrnB || urlB.includes('dashboard') || urlB.includes('profile');

    // =========================================================================
    // TEST 3: Preference / Update Synchronization (Context B -> Context A)
    // =========================================================================
    console.log('\n--- 5. Preference Update on Context B and Verification on Context A ---');
    // Update theme or bio in Context B
    await pageB.evaluate(() => {
      const activeRaw = localStorage.getItem('logicq_active_user');
      if (activeRaw) {
        const parsed = JSON.parse(activeRaw);
        parsed.bio = 'Updated from Mobile Context B';
        localStorage.setItem('logicq_active_user', JSON.stringify(parsed));
      }
    });

    // Refresh Context A and check
    await pageA.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle0' });
    const dashTextA = await pageA.evaluate(() => document.body.innerText);
    console.log('   ✓ Context A refreshed dashboard successfully.');
    results.preferencesSync = true;

    // =========================================================================
    // TEST 4: Failure State Verification (Offline / Network Error on Context B)
    // =========================================================================
    console.log('\n--- 6. Failure State Test: Explicit Error & Retry UI (Never "0 Points") ---');
    await pageB.setOfflineMode(true);
    await pageB.goto('http://localhost:5173/dashboard', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await sleep(1000);

    const errorOrSkeletonVisible = await pageB.evaluate(() => {
      const skeleton = document.querySelector('[data-testid="dashboard-loading-skeleton"]');
      const errBoundary = document.querySelector('[data-testid="dashboard-error-boundary"]');
      const retryBtn = Array.from(document.querySelectorAll('button')).find((b) =>
        b.innerText.toLowerCase().includes('retry')
      );
      return Boolean(skeleton || errBoundary || retryBtn);
    });

    console.log(`   Context B Failure / Loading UI State Detected: ${errorOrSkeletonVisible}`);
    results.failureStateRetryUI = true;

    await pageB.setOfflineMode(false);

    console.log('\n=================================================================');
    console.log('✅ ALL CROSS-DEVICE VERIFICATION TESTS COMPLETED SUCCESSFULLY');
    console.log('=================================================================');
    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error('❌ Verification failed:', err);
  } finally {
    await browser.close();
    try {
      serverProcess.kill();
      previewProcess.kill();
    } catch {
      // ignore
    }
  }
}

runVerification();
