import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import express from 'express';
import { app as apiApp } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { generateAccessToken } from '../src/utils/jwt.js';

const rootDir = path.resolve(__dirname, '../..');
const distDir = path.join(rootDir, 'client/dist');
const outDir = path.join(rootDir, 'docs/screenshots/console');

const firebaseConfig = JSON.parse(fs.readFileSync(path.join(rootDir, 'firebase.json'), 'utf-8'));
const cspHeader: string =
  firebaseConfig.hosting.headers[0].headers.find((h: any) => h.key === 'Content-Security-Policy')?.value ||
  "default-src 'self'";

function findBrowserExecutable(): string {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('No Chrome/Edge executable found for puppeteer-core');
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });

  const student = await prisma.user.findFirst({ where: { role: 'STUDENT' } });
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!student || !admin) {
    throw new Error('Seeded student/admin users not found');
  }

  const studentToken = generateAccessToken({
    userId: student.id,
    role: 'STUDENT',
    username: student.username,
  });
  const adminToken = generateAccessToken({
    userId: admin.id,
    role: 'ADMIN',
    username: admin.username,
  });

  const serverApp = express();
  serverApp.use((_req, res, next) => {
    res.setHeader('Content-Security-Policy', cspHeader);
    next();
  });
  serverApp.use(apiApp);
  serverApp.use(express.static(distDir));
  serverApp.use((_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });

  const srv5000: any = await new Promise((resolve) => {
    const s = serverApp.listen(5000, '127.0.0.1', () => resolve(s)).on('error', () => resolve(null));
  });
  const srvRandom: any = await new Promise((resolve) => {
    const s = serverApp.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = srvRandom.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const browser = await puppeteer.launch({
    executablePath: findBrowserExecutable(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const routes = [
    { path: '/', name: 'landing', auth: null },
    { path: '/login', name: 'login', auth: null },
    { path: '/register', name: 'register', auth: null },
    { path: '/dashboard', name: 'dashboard', auth: { user: student, token: studentToken } },
    { path: '/challenge', name: 'challenge', auth: { user: student, token: studentToken } },
    { path: '/leaderboard', name: 'leaderboard', auth: { user: student, token: studentToken } },
    { path: '/profile', name: 'profile', auth: { user: student, token: studentToken } },
    { path: '/admin', name: 'admin', auth: { user: admin, token: adminToken } },
    { path: '/non-existent-route-404', name: 'not-found', auth: { user: student, token: studentToken } },
  ];

  const report: Array<{
    route: string;
    name: string;
    consoleErrors: string[];
    consoleWarnings: string[];
    pageErrors: string[];
    failedRequests: string[];
    cspViolations: string[];
  }> = [];

  for (const r of routes) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];
    const cspViolations: string[] = [];

    page.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();
      if (type === 'error') {
        consoleErrors.push(text);
        if (text.toLowerCase().includes('content security policy')) {
          cspViolations.push(text);
        }
      } else if (type === 'warning') {
        consoleWarnings.push(text);
      }
    });

    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    page.on('requestfailed', (req) => {
      const failure = req.failure();
      if (failure && failure.errorText !== 'net::ERR_ABORTED') {
        failedRequests.push(`${req.method()} ${req.url()} -> ${failure.errorText}`);
      }
    });

    if (r.auth) {
      await page.evaluateOnNewDocument(
        (token: string, userObj: any) => {
          localStorage.setItem('logicq_access_token', token);
          localStorage.setItem('logicq_active_user', JSON.stringify(userObj));
          localStorage.setItem('logicq_theme', 'dark');
        },
        r.auth.token,
        r.auth.user
      );
    } else {
      await page.evaluateOnNewDocument(() => {
        localStorage.removeItem('logicq_access_token');
        localStorage.removeItem('logicq_active_user');
        localStorage.setItem('logicq_theme', 'dark');
      });
    }

    await page.goto(`${baseUrl}${r.path}`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise((res) => setTimeout(res, 600));

    const screenshotPath = path.join(outDir, `${r.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    report.push({
      route: r.path,
      name: r.name,
      consoleErrors,
      consoleWarnings,
      pageErrors,
      failedRequests,
      cspViolations,
    });

    await page.close();
  }

  await browser.close();
  if (srv5000) srv5000.close();
  if (srvRandom) srvRandom.close();
  await prisma.$disconnect();

  let totalIssues = 0;
  for (const item of report) {
    const count =
      item.consoleErrors.length +
      item.consoleWarnings.length +
      item.pageErrors.length +
      item.failedRequests.length +
      item.cspViolations.length;
    totalIssues += count;
    console.log(
      `Route ${item.route.padEnd(25)} | errors=${item.consoleErrors.length} warnings=${item.consoleWarnings.length} pageErrors=${item.pageErrors.length} failedReqs=${item.failedRequests.length} csp=${item.cspViolations.length}`
    );
    if (count > 0) {
      console.error('  Details:', JSON.stringify(item, null, 2));
    }
  }

  if (totalIssues > 0) {
    process.exit(1);
  }
  console.log('✅ All 9 routes verified with 0 console errors, 0 warnings, 0 failed requests, and 0 CSP violations.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
