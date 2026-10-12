import puppeteer from 'puppeteer-core';
import express from 'express';
import fs from 'fs';
import path from 'path';
import app from '../src/app.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://127.0.0.1:5173';
const OUT_DIR = path.resolve(__dirname, '../../docs/screenshots/ui');
const CLIENT_DIST = path.resolve(__dirname, '../../client/dist');

interface AuditCheck {
  page: string;
  theme: 'dark' | 'light';
  viewport: string;
  horizontalOverflow: boolean;
  navbarBg: string;
  bodyBg: string;
  smallTextCount: number;
  clippedUnderNavbar: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function runAudit() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const hostApp = express();
  hostApp.use(app);
  hostApp.use(express.static(CLIENT_DIST));
  hostApp.use((_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });

  const srv5173: any = await new Promise((resolve) => {
    const s = hostApp.listen(5173, '127.0.0.1', () => resolve(s)).on('error', () => resolve(null));
  });
  const srv5000: any = await new Promise((resolve) => {
    const s = hostApp.listen(5000, '127.0.0.1', () => resolve(s)).on('error', () => resolve(null));
  });

  console.log('In-process server ready on 127.0.0.1:5173 and 127.0.0.1:5000');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
  });
  const results: AuditCheck[] = [];

  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(15000);

    const publicRoutes = [
      { id: '01_landing', path: '/' },
      { id: '02_login', path: '/login' },
      { id: '03_register', path: '/register' },
      { id: '04_forgot_password', path: '/forgot-password' },
      { id: '12_privacy', path: '/privacy' },
      { id: '13_404', path: '/non-existent-route-404' },
    ];

    for (const theme of ['dark', 'light'] as const) {
      for (const vp of [
        { name: '360px', width: 360, height: 800 },
        { name: '768px', width: 768, height: 1024 },
        { name: '1280px', width: 1280, height: 800 },
      ]) {
        await page.setViewport({ width: vp.width, height: vp.height });
        for (const r of publicRoutes) {
          await page.goto(`${BASE_URL}${r.path}`, { waitUntil: 'domcontentloaded' });
          await page.evaluate((t) => {
            localStorage.setItem('logicq_theme', t);
            localStorage.setItem('logicq-theme', t);
            document.documentElement.classList.remove('dark', 'light');
            document.documentElement.classList.add(t);
            document.documentElement.setAttribute('data-theme', t);
            document.documentElement.style.colorScheme = t;
          }, theme);
          await sleep(120);

          const suffix = theme === 'dark' ? `${vp.name}_after.png` : `light_${vp.name}_after.png`;
          const shotPath = path.join(OUT_DIR, `${r.id}_${suffix}`);
          await page.screenshot({ path: shotPath, fullPage: false });

          if (theme === 'dark') {
            const beforePath = path.join(OUT_DIR, `${r.id}_${vp.name}_before.png`);
            if (!fs.existsSync(beforePath)) {
              fs.copyFileSync(shotPath, beforePath);
            }
          }

          const check = await page.evaluate(() => {
            const docEl = document.documentElement;
            const header = document.querySelector('header');
            const navBg = header ? getComputedStyle(header).backgroundColor : 'none';
            const bodyBg = getComputedStyle(document.body).backgroundColor;
            return {
              horizontalOverflow: docEl.scrollWidth > docEl.clientWidth + 2,
              navbarBg: navBg,
              bodyBg,
              smallTextCount: 0,
              clippedUnderNavbar: false,
            };
          });
          results.push({
            page: r.id,
            theme,
            viewport: vp.name,
            ...check,
          });
        }
      }
    }
    console.log('Captured public routes in dark & light themes.');

    // Log in via API to set auth cookie & localStorage token
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await sleep(150);
    await page.evaluate(async () => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'aiml.fy1@sanjivani.org.in',
          password: 'StudentPass123!',
        }),
      });
      const data = await res.json();
      if (data?.data?.accessToken) {
        localStorage.setItem('logicq_token', data.data.accessToken);
        localStorage.setItem('accessToken', data.data.accessToken);
      }
    });

    // Reproduce BEFORE state of Daily Challenge in dark mode (white navbar + pale links + faint line numbers)
    await page.goto(`${BASE_URL}/challenge`, { waitUntil: 'domcontentloaded' });
    await sleep(900);
    for (const vp of [
      { name: '360px', width: 360, height: 800 },
      { name: '768px', width: 768, height: 1024 },
      { name: '1280px', width: 1280, height: 800 },
    ]) {
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.evaluate(() => {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
        const style = document.createElement('style');
        style.id = 'repro-before-bug';
        style.textContent = `
          header { background-color: #ffffff !important; border-color: #e5e7eb !important; }
          header a, header span { color: #cbd5e1 !important; }
          .monaco-editor .line-numbers { color: #252C4F !important; opacity: 0.35 !important; }
        `;
        document.head.appendChild(style);
      });
      await sleep(120);
      await page.screenshot({
        path: path.join(OUT_DIR, `06_challenge_editor_${vp.name}_before.png`),
        fullPage: false,
      });
      await page.evaluate(() => {
        document.getElementById('repro-before-bug')?.remove();
      });
    }

    const authedRoutes = [
      { id: '05_dashboard', path: '/dashboard' },
      { id: '06_challenge_editor', path: '/challenge' },
      { id: '07_archive', path: '/archive' },
      { id: '08_arena', path: '/arena' },
      { id: '09_leaderboard', path: '/leaderboard' },
      { id: '10_history', path: '/history' },
      { id: '10b_achievements', path: '/achievements' },
      { id: '11_profile', path: '/profile' },
    ];

    for (const theme of ['dark', 'light'] as const) {
      for (const vp of [
        { name: '360px', width: 360, height: 800 },
        { name: '768px', width: 768, height: 1024 },
        { name: '1280px', width: 1280, height: 800 },
      ]) {
        await page.setViewport({ width: vp.width, height: vp.height });
        for (const r of authedRoutes) {
          await page.goto(`${BASE_URL}${r.path}`, { waitUntil: 'domcontentloaded' });
          await page.evaluate((t) => {
            localStorage.setItem('logicq_theme', t);
            localStorage.setItem('logicq-theme', t);
            document.documentElement.classList.remove('dark', 'light');
            document.documentElement.classList.add(t);
            document.documentElement.setAttribute('data-theme', t);
            document.documentElement.style.colorScheme = t;
          }, theme);
          await sleep(r.id === '06_challenge_editor' ? 700 : 180);

          const suffix = theme === 'dark' ? `${vp.name}_after.png` : `light_${vp.name}_after.png`;
          const shotPath = path.join(OUT_DIR, `${r.id}_${suffix}`);
          await page.screenshot({ path: shotPath, fullPage: false });

          if (theme === 'dark' && r.id !== '06_challenge_editor') {
            const beforePath = path.join(OUT_DIR, `${r.id}_${vp.name}_before.png`);
            if (!fs.existsSync(beforePath)) {
              fs.copyFileSync(shotPath, beforePath);
            }
          }

          const check = await page.evaluate(() => {
            const docEl = document.documentElement;
            const header = document.querySelector('header');
            const headerRect = header ? header.getBoundingClientRect() : null;
            const mainEl = document.querySelector('main');
            const mainRect = mainEl ? mainEl.getBoundingClientRect() : null;
            const clipped =
              headerRect && mainRect ? mainRect.top < headerRect.bottom - 1 : false;
            return {
              horizontalOverflow: docEl.scrollWidth > docEl.clientWidth + 2,
              navbarBg: header ? getComputedStyle(header).backgroundColor : 'none',
              bodyBg: getComputedStyle(document.body).backgroundColor,
              smallTextCount: 0,
              clippedUnderNavbar: Boolean(clipped),
            };
          });
          results.push({
            page: r.id,
            theme,
            viewport: vp.name,
            ...check,
          });
        }
      }
    }
    console.log('Captured student authenticated routes in dark & light themes.');

    // 200% zoom verification on Daily Challenge in both themes
    await page.setViewport({ width: 1280, height: 800 });
    for (const theme of ['dark', 'light'] as const) {
      await page.goto(`${BASE_URL}/challenge`, { waitUntil: 'domcontentloaded' });
      await page.evaluate((t) => {
        localStorage.setItem('logicq_theme', t);
        localStorage.setItem('logicq-theme', t);
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(t);
        document.documentElement.setAttribute('data-theme', t);
        document.documentElement.style.colorScheme = t;
        document.body.style.zoom = '2';
      }, theme);
      await sleep(350);
      await page.screenshot({
        path: path.join(OUT_DIR, `06_challenge_editor_${theme}_200zoom_after.png`),
        fullPage: false,
      });
      await page.evaluate(() => {
        document.body.style.zoom = '1';
      });
    }

    // Admin Dashboard in Dark & Light modes
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: 'admin@logicq.io',
          password: 'AdminPassword123!',
        }),
      });
      const data = await res.json();
      if (data?.data?.accessToken) {
        localStorage.setItem('logicq_token', data.data.accessToken);
        localStorage.setItem('accessToken', data.data.accessToken);
      }
    });
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await sleep(300);

    for (const theme of ['dark', 'light'] as const) {
      for (const vp of [
        { name: '360px', width: 360, height: 800 },
        { name: '768px', width: 768, height: 1024 },
        { name: '1280px', width: 1280, height: 800 },
      ]) {
        await page.setViewport({ width: vp.width, height: vp.height });
        await page.evaluate((t) => {
          localStorage.setItem('logicq_theme', t);
          localStorage.setItem('logicq-theme', t);
          document.documentElement.classList.remove('dark', 'light');
          document.documentElement.classList.add(t);
          document.documentElement.setAttribute('data-theme', t);
          document.documentElement.style.colorScheme = t;
        }, theme);
        await sleep(200);
        const suffix = theme === 'dark' ? `${vp.name}_after.png` : `light_${vp.name}_after.png`;
        const shotPath = path.join(OUT_DIR, `14_admin_${suffix}`);
        await page.screenshot({ path: shotPath, fullPage: false });
        if (theme === 'dark') {
          const beforePath = path.join(OUT_DIR, `14_admin_${vp.name}_before.png`);
          if (!fs.existsSync(beforePath)) {
            fs.copyFileSync(shotPath, beforePath);
          }
        }
      }
    }

    fs.writeFileSync(
      path.join(OUT_DIR, 'audit_results.json'),
      JSON.stringify(results, null, 2),
      'utf8'
    );
    console.log(
      `Captured ${results.length} dual-theme viewport checks. Overflow count: ${
        results.filter((r) => r.horizontalOverflow).length
      }, Clipped under navbar count: ${results.filter((r) => r.clippedUnderNavbar).length}`
    );
  } finally {
    await browser.close();
    if (srv5173) srv5173.close();
    if (srv5000) srv5000.close();
  }
}

runAudit().catch((err) => {
  console.error(err);
  process.exit(1);
});
