import puppeteer from 'puppeteer-core';
import express from 'express';
import fs from 'fs';
import path from 'path';
import app from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { generateAccessToken } from '../src/utils/jwt.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = path.resolve(__dirname, '../../docs/screenshots/audit');
const CLIENT_DIST = path.resolve(__dirname, '../../client/dist');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const hostApp = express();
  hostApp.use(app);
  hostApp.use(express.static(CLIENT_DIST));
  hostApp.use((_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });

  const srv: any = await new Promise((resolve) => {
    const s = hostApp.listen(5173, '127.0.0.1', () => resolve(s)).on('error', () => resolve(null));
  });

  console.log('Test server ready on http://127.0.0.1:5173');

  // Seed / ensure test student in DB with 0 points
  const testStudentUser = await prisma.user.upsert({
    where: { username: 'ipworker1908' },
    update: {
      totalPoints: 0,
      currentStreak: 0,
      college: 'Sanjivani College of Engineering', // Explicitly seed old college name to test
      displayName: null,
      department: 'CSE',
      year: 'FY',
      division: 'A',
    },
    create: {
      id: 'usr_audit_student_6128',
      username: 'ipworker1908',
      email: 'student6128@sanjivani.edu.in',
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
      prn: '202610126128',
      college: 'Sanjivani College of Engineering',
      department: 'CSE',
      year: 'FY',
      division: 'A',
      role: 'STUDENT',
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      profileComplete: true,
      displayName: null,
    },
  });

  const token = generateAccessToken({
    userId: testStudentUser.id,
    role: testStudentUser.role,
    username: testStudentUser.username,
  });

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const logs: string[] = [];
    page.on('console', (msg) => logs.push(`[CONSOLE ${msg.type()}] ${msg.text()}`));
    page.on('pageerror', (err) => logs.push(`[PAGEERROR] ${err.message}`));

    // Seed session in localStorage
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });

    await page.evaluate(
      ({ user, token }) => {
        localStorage.setItem('logicq_active_user', JSON.stringify(user));
        localStorage.setItem('logicq_access_token', token);
        localStorage.setItem('logicq_fallback_current_user_id_v1', user.id);
        localStorage.setItem('logicq_fallback_users_v1', JSON.stringify([user]));
        localStorage.setItem('logicq_last_activity', String(Date.now()));
      },
      { user: testStudentUser, token }
    );

    // 1. Navigate to /profile/ipworker1908 (Symptom 5 reproduction)
    await page.goto('http://127.0.0.1:5173/profile/ipworker1908', { waitUntil: 'networkidle0' });
    await sleep(1500);

    await page.screenshot({ path: path.join(OUT_DIR, '01_symptom_profile_header.png') });
    console.log('Captured 01_symptom_profile_header.png');

    const headerData = await page.evaluate(() => {
      const h1 = document.querySelector('h1')?.textContent;
      const rankBadge = document.querySelector('.glass-card .bg-\\[\\#8B9BFF\\]\\/15')?.textContent;
      const collegeSpan = Array.from(document.querySelectorAll('span')).find((s) =>
        s.textContent?.includes('Sanjivani')
      )?.textContent;
      return { h1, rankBadge, collegeSpan, url: window.location.pathname };
    });
    console.log('Symptom 2, 3 & 5 Check:', headerData);

    // 2. Open Profile Settings Modal (Symptom 1 & 4 reproduction)
    const editBtn = await page.$('[data-testid="edit-profile-btn"]');
    if (editBtn) {
      await editBtn.click();
      await sleep(600);

      await page.screenshot({ path: path.join(OUT_DIR, '02_symptom_profile_modal_opened.png') });
      console.log('Captured 02_symptom_profile_modal_opened.png');

      const modalInfo = await page.evaluate(() => {
        const input = document.querySelector('#edit-display-name') as HTMLInputElement;
        const collegeText = Array.from(document.querySelectorAll('div, span')).find((el) =>
          el.textContent?.includes('College (Locked)')
        )?.parentElement?.textContent;
        const dialogEl = document.querySelector('[role="dialog"]') as HTMLElement;
        const headerEl = document.querySelector('header') as HTMLElement;
        const zIndex = dialogEl ? window.getComputedStyle(dialogEl).zIndex : 'none';
        const headerZIndex = headerEl ? window.getComputedStyle(headerEl).zIndex : 'none';
        return {
          placeholder: input?.placeholder,
          collegeText,
          modalZIndex: zIndex,
          headerZIndex: headerZIndex,
        };
      });
      console.log('Symptom 1, 3 & 4 Modal Info:', modalInfo);

      // Type new values
      await page.type('#edit-display-name', 'CodeMaster');
      await page.select('#edit-department', 'AIML');
      await page.select('#edit-year', 'SY');
      await page.type('#edit-division', 'B');

      await page.screenshot({ path: path.join(OUT_DIR, '03_symptom_profile_modal_filled.png') });

      // Click Save Settings
      const saveBtn = await page.$('button[type="submit"]');
      if (saveBtn) {
        await saveBtn.click();
        await sleep(1200);
      }

      // Reopen modal to observe Symptom 1 (empty field, fallback mismatch)
      const reopenBtn = await page.$('[data-testid="edit-profile-btn"]');
      if (reopenBtn) {
        await reopenBtn.click();
        await sleep(600);
        await page.screenshot({ path: path.join(OUT_DIR, '04_symptom_profile_after_save.png') });

        const afterSaveInfo = await page.evaluate(() => {
          const input = document.querySelector('#edit-display-name') as HTMLInputElement;
          const h1 = document.querySelector('h1')?.textContent;
          return {
            inputValue: input?.value,
            inputPlaceholder: input?.placeholder,
            headerTitle: h1,
          };
        });
        console.log('Symptom 1 After Save Info:', afterSaveInfo);
      }
    }

    // 3. Test Mobile 360px viewport clipping (Symptom 4 reproduction)
    await page.setViewport({ width: 360, height: 640 });
    await sleep(500);
    await page.screenshot({ path: path.join(OUT_DIR, '05_symptom_mobile_360_modal.png') });
    console.log('Captured 05_symptom_mobile_360_modal.png');

    // 4. Test Leaderboard (Symptom 2 reproduction)
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto('http://127.0.0.1:5173/leaderboard', { waitUntil: 'networkidle0' });
    await sleep(1500);
    await page.screenshot({ path: path.join(OUT_DIR, '06_symptom_leaderboard_rank.png') });
    console.log('Captured 06_symptom_leaderboard_rank.png');

    const leaderboardInfo = await page.evaluate(() => {
      const pinned = document.querySelector('[data-testid="pinned-own-row"]')?.textContent;
      const rankBadge = document.querySelector('[data-testid="pinned-own-row"] .font-extrabold')?.textContent;
      const rows = Array.from(document.querySelectorAll('tbody tr')).map((r) => r.textContent);
      return { pinned, rankBadge, rowsCount: rows.length };
    });
    console.log('Symptom 2 Leaderboard Info:', leaderboardInfo);

    console.log('\nAudit reproduction complete.');
  } finally {
    await browser.close();
    if (srv) srv.close();
    await prisma.$disconnect();
  }
}

main().catch(console.error);
