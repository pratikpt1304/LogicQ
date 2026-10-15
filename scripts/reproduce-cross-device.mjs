import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function runReproduction() {
  console.log('=== STARTING CROSS-DEVICE BUG REPRODUCTION ===');

  console.log('Starting Vite preview server on port 5173...');
  const previewProcess = spawn('npx.cmd', ['vite', 'preview', '--port', '5173'], {
    cwd: path.resolve('client'),
    stdio: 'pipe',
    shell: true,
  });

  await new Promise((resolve) => {
    previewProcess.stdout.on('data', (d) => {
      const msg = d.toString();
      if (msg.includes('http://localhost:5173')) {
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

  const evidence = {
    testStudentEmail: 'cross_device_student@sanjivani.edu.in',
    testPrn: '2024AIMF1001',
    contextA: {
      device: 'Context A (Desktop 1280x800)',
      navigatedTo: null,
      storageKeys: [],
      storageDump: {},
      console: [],
      networkRequests: [],
    },
    contextB: {
      device: 'Context B (Mobile 360x780)',
      storageKeysBeforeLogin: [],
      storageKeysAfterLogin: [],
      loginError: null,
      navigatedTo: null,
      storageDump: {},
      console: [],
      networkRequests: [],
    },
  };

  try {
    // 1. Context A: Desktop Viewport
    console.log('\n--- CONTEXT A (Desktop 1280x800) ---');
    const contextA = await browser.createBrowserContext();
    const pageA = await contextA.newPage();
    await pageA.setViewport({ width: 1280, height: 800 });

    pageA.on('console', (msg) => evidence.contextA.console.push(`[${msg.type()}] ${msg.text()}`));
    pageA.on('request', (req) => evidence.contextA.networkRequests.push(`${req.method()} ${req.url()}`));

    await pageA.goto('http://localhost:5173/register', { waitUntil: 'networkidle0' });

    console.log('Filling registration form on Context A...');
    await pageA.type('#fullname-input', 'Alex Student');
    await pageA.type('#prn-input', '2024AIMF1001');
    await pageA.select('#department-select', 'AIML');
    await pageA.select('#year-select', 'FY');
    await pageA.type('#email-input', 'cross_device_student@sanjivani.edu.in');
    await pageA.type('#password-input', 'StrongPassword123!');
    await pageA.type('#confirm-password-input', 'StrongPassword123!');

    // Submit form
    console.log('Submitting registration on Context A...');
    const submitBtn = await pageA.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      await new Promise((r) => setTimeout(r, 2500));
    }

    const currentUrlA = pageA.url();
    console.log('Context A navigated to:', currentUrlA);
    evidence.contextA.navigatedTo = currentUrlA;

    // Dump localStorage on Context A
    const storageA = await pageA.evaluate(() => {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        data[k] = localStorage.getItem(k);
      }
      return data;
    });
    evidence.contextA.storageKeys = Object.keys(storageA);
    evidence.contextA.storageDump = storageA;
    console.log('Context A localStorage keys:', Object.keys(storageA));
    console.log('Context A active user:', storageA['logicq_active_user']);

    // 2. Context B: Mobile Viewport (simulating a second device: smartphone)
    console.log('\n--- CONTEXT B (Mobile Viewport 360x780) ---');
    const contextB = await browser.createBrowserContext();
    const pageB = await contextB.newPage();
    await pageB.setViewport({ width: 360, height: 780, isMobile: true, hasTouch: true });

    pageB.on('console', (msg) => evidence.contextB.console.push(`[${msg.type()}] ${msg.text()}`));
    pageB.on('request', (req) => evidence.contextB.networkRequests.push(`${req.method()} ${req.url()}`));

    await pageB.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' });

    // Check localStorage on Context B before login
    const storageBBefore = await pageB.evaluate(() => {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        data[k] = localStorage.getItem(k);
      }
      return data;
    });
    evidence.contextB.storageKeysBeforeLogin = Object.keys(storageBBefore);
    console.log('Context B (New Device) localStorage keys BEFORE login:', Object.keys(storageBBefore));

    // Attempt login on Context B with the same student credentials
    console.log('Attempting login on Context B with same credentials...');
    await pageB.type('input[placeholder*="admin@logicq.io"]', 'cross_device_student@sanjivani.edu.in');
    await pageB.type('input[type="password"]', 'StrongPassword123!');

    const loginSubmitBtn = await pageB.$('button[type="submit"]');
    if (loginSubmitBtn) {
      await loginSubmitBtn.click();
      await new Promise((r) => setTimeout(r, 2000));
    }

    const currentUrlB = pageB.url();
    console.log('Context B navigated to:', currentUrlB);
    evidence.contextB.navigatedTo = currentUrlB;

    const errorMsgB = await pageB.evaluate(() => {
      const el = document.querySelector('[role="alert"], .text-red-500, .text-rose-300');
      return el ? el.textContent : null;
    });
    evidence.contextB.loginError = errorMsgB;
    console.log('Context B login error result:', errorMsgB);

    // Dump localStorage on Context B after login attempt
    const storageBAfter = await pageB.evaluate(() => {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        data[k] = localStorage.getItem(k);
      }
      return data;
    });
    evidence.contextB.storageKeysAfterLogin = Object.keys(storageBAfter);
    evidence.contextB.storageDump = storageBAfter;
    console.log('Context B localStorage keys AFTER login:', Object.keys(storageBAfter));

    // Write evidence JSON
    fs.writeFileSync('docs/CROSS_DEVICE_EVIDENCE.json', JSON.stringify(evidence, null, 2));
    console.log('\n=== REPRODUCTION COMPLETE: Evidence written to docs/CROSS_DEVICE_EVIDENCE.json ===');
  } finally {
    await browser.close();
    previewProcess.kill();
  }
}

runReproduction().catch(console.error);
