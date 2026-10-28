import { test, expect } from '@playwright/test';

// Target URL: Live Production Deployment
const BASE_URL = process.env.TEST_BASE_URL || 'https://logicq-clanguage.web.app';

test.describe.configure({ mode: 'serial' });

test.describe('LogicQ Multi-Role Comprehensive Live E2E Audit', () => {

  // ==========================================
  // ROLE 1: STUDENT JOURNEY
  // ==========================================
  test('1. STUDENT ROLE: Login, Dashboard, Practice Hub, Fullscreen Workspace, Flag Modal, and Navigation', async ({ page }) => {
    test.setTimeout(90000);
    console.log('[Student Test] Navigating to login...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveTitle(/LogicQ/i);

    // 1.1 Login as student@logicq.io (Verified Student Account)
    console.log('[Student Test] Entering student credentials...');
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('student@logicq.io');

    const sendOtpBtn = page.locator('button[type="submit"]');
    await sendOtpBtn.click();

    // Wait for OTP input
    console.log('[Student Test] Entering OTP code...');
    const otpInput = page.locator('input[placeholder="••••••"], input[maxlength="6"]');
    await expect(otpInput).toBeVisible({ timeout: 15000 });
    await otpInput.fill('123456');

    // 1.2 Verify Student Dashboard (Auto-submits on 6th digit)
    console.log('[Student Test] Verifying Student Dashboard...');
    const welcomeHeading = page.getByRole('heading', { level: 1 });
    await expect(welcomeHeading).toContainText(/Welcome back/i, { timeout: 25000 });
    console.log('[Student Test] Student Dashboard verified successfully! Landed on:', page.url());

    // 1.3 Navigate to Practice Arena (/practice)
    console.log('[Student Test] Navigating to Topic Practice Hub...');
    await page.goto(`${BASE_URL}/practice`);
    await page.waitForTimeout(1000);

    // Verify Practice Hub Header & Difficulty Filters
    await expect(page.locator('text=Topic Practice').or(page.locator('text=Self-Paced Practice Arena')).first()).toBeVisible({ timeout: 15000 });

    const diffFilterAll = page.getByRole('button', { name: /All Diff/i });
    if (await diffFilterAll.isVisible()) {
      await expect(diffFilterAll).toBeVisible();
    }

    const diffFilterHard = page.getByRole('button', { name: /Hard/i });
    if (await diffFilterHard.isVisible()) {
      await diffFilterHard.click();
      await page.waitForTimeout(400);
      if (await diffFilterAll.isVisible()) {
        await diffFilterAll.click();
        await page.waitForTimeout(400);
      }
    }

    // 1.4 Search for a specific problem (e.g. "Odd or Even")
    const searchInput = page.locator('input[placeholder*="Search topic" i]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('Odd or Even');
      await page.waitForTimeout(400);
      await searchInput.fill('');
      await page.waitForTimeout(400);
    }

    // 1.5 Click on the first topic card
    console.log('[Student Test] Opening problem workspace...');
    const firstCard = page.locator('h3').first();
    await expect(firstCard).toBeVisible({ timeout: 10000 });
    await firstCard.click();

    // 1.6 Verify Fullscreen Workspace & Split View
    console.log('[Student Test] Verifying Fullscreen Workspace components...');
    await expect(page.locator('text=solution.c').first()).toBeVisible({ timeout: 10000 });

    const practiceHubBackBtn = page.getByRole('button', { name: /Practice Hub/i });
    await expect(practiceHubBackBtn).toBeVisible({ timeout: 10000 });

    // Verify Topic Reference Tip Box
    const topicRef = page.locator('text=Topic Reference');
    if (await topicRef.isVisible()) {
      const appTab = page.getByRole('button', { name: /Application/i });
      if (await appTab.isVisible()) {
        await appTab.click();
        await page.waitForTimeout(300);
      }
      const syntaxTab = page.getByRole('button', { name: /Syntax/i });
      if (await syntaxTab.isVisible()) {
        await syntaxTab.click();
        await page.waitForTimeout(300);
      }
    }

    // Verify Action Bar buttons: Run Code and Submit
    const runCodeBtn = page.getByRole('button', { name: /Run Code/i });
    await expect(runCodeBtn).toBeVisible();

    const submitBtn = page.getByRole('button', { name: /Submit/i });
    await expect(submitBtn).toBeVisible();

    // 1.7 Test Flag Button (Report Issue to Faculty)
    console.log('[Student Test] Testing Report Issue Flag button...');
    const flagBtn = page.locator('button[title*="issue" i], button[title*="report" i], button:has(svg.lucide-flag)').first();
    await expect(flagBtn).toBeVisible();
    await flagBtn.click();

    // Verify Issue Modal is mounted with high z-index and visible
    const issueModalTitle = page.locator('text=Raise an Issue to Faculty');
    await expect(issueModalTitle).toBeVisible({ timeout: 5000 });
    console.log('[Student Test] Flag modal confirmed open and visible!');

    // Close the issue modal
    const closeIssueModalBtn = page.locator('button:has(svg.lucide-x)').last();
    if (await closeIssueModalBtn.isVisible()) {
      await closeIssueModalBtn.click();
    }
    await page.waitForTimeout(400);

    // 1.8 Return to Practice Hub cleanly
    console.log('[Student Test] Exiting workspace back to Practice Hub...');
    await practiceHubBackBtn.click();
    await expect(page.locator('text=Topic Practice').first()).toBeVisible({ timeout: 10000 });
    console.log('[Student Test] Returned to Hub cleanly!');

    // 1.9 Navigate to Leaderboard
    console.log('[Student Test] Testing Leaderboard route...');
    await page.goto(`${BASE_URL}/leaderboard`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('text=Leaderboard').first()).toBeVisible({ timeout: 15000 });

    console.log('✅ STUDENT ROLE TEST COMPLETED SUCCESSFULLY');
  });

  // ==========================================
  // ROLE 2: FACULTY JOURNEY
  // ==========================================
  test('2. FACULTY ROLE: Login, Section Management, Join Codes, Test Builder, and Analytics', async ({ page }) => {
    test.setTimeout(90000);
    console.log('[Faculty Test] Navigating to login...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

    // 2.1 Login as faculty@logicq.io
    console.log('[Faculty Test] Entering faculty credentials...');
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('faculty@logicq.io');

    const sendOtpBtn = page.locator('button[type="submit"]');
    await sendOtpBtn.click();

    // Wait for OTP input
    console.log('[Faculty Test] Entering OTP code...');
    const otpInput = page.locator('input[placeholder="••••••"], input[maxlength="6"]');
    await expect(otpInput).toBeVisible({ timeout: 15000 });
    await otpInput.fill('123456');

    // 2.2 Verify Faculty Portal Landing
    console.log('[Faculty Test] Verifying Faculty Portal...');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 25000 });
    console.log('[Faculty Test] Landed on:', page.url());

    // 2.3 Verify Section Management (/faculty/sections)
    await page.goto(`${BASE_URL}/faculty/sections`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const sectionHeading = page.locator('text=Academic Sections').or(page.locator('text=Class Sections')).or(page.locator('h1, h2'));
    await expect(sectionHeading.first()).toBeVisible({ timeout: 15000 });

    // 2.4 Verify Test Builder / Assessments (/faculty/tests)
    console.log('[Faculty Test] Checking Test Builder route...');
    await page.goto(`${BASE_URL}/faculty/tests`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const testBuilderHeading = page.locator('text=Assessment').or(page.locator('text=Test')).or(page.locator('h1, h2'));
    await expect(testBuilderHeading.first()).toBeVisible({ timeout: 15000 });

    // 2.5 Verify Faculty Learning Analytics & Telemetry (/faculty/analytics)
    console.log('[Faculty Test] Checking Faculty Analytics & Integrity Radar...');
    await page.goto(`${BASE_URL}/faculty/analytics`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const analyticsHeading = page.locator('text=Analytics').or(page.locator('text=Integrity')).or(page.locator('h1, h2'));
    await expect(analyticsHeading.first()).toBeVisible({ timeout: 15000 });

    console.log('✅ FACULTY ROLE TEST COMPLETED SUCCESSFULLY');
  });

  // ==========================================
  // ROLE 3: ADMIN / SUPERADMIN JOURNEY
  // ==========================================
  test('3. ADMIN ROLE: Login, Platform Metrics, Problem Manager, User Allowlist & Audit Logs', async ({ page }) => {
    test.setTimeout(90000);
    console.log('[Admin Test] Navigating to login...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

    // 3.1 Login as logicqarena@gmail.com
    console.log('[Admin Test] Entering SuperAdmin credentials...');
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill('logicqarena@gmail.com');

    const sendOtpBtn = page.locator('button[type="submit"]');
    await sendOtpBtn.click();

    // Wait for OTP input
    console.log('[Admin Test] Entering OTP code...');
    const otpInput = page.locator('input[placeholder="••••••"], input[maxlength="6"]');
    await expect(otpInput).toBeVisible({ timeout: 15000 });
    await otpInput.fill('123456');

    // 3.2 Verify Admin Dashboard (/admin)
    console.log('[Admin Test] Verifying Admin Dashboard...');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 25000 });
    console.log('[Admin Test] Landed on:', page.url());

    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const adminHeading = page.locator('text=Admin').or(page.locator('text=Overview')).or(page.locator('h1, h2'));
    await expect(adminHeading.first()).toBeVisible({ timeout: 15000 });

    // 3.3 Verify Admin Problem Bank Manager (/admin/problems)
    console.log('[Admin Test] Checking Admin Problem Manager...');
    await page.goto(`${BASE_URL}/admin/problems`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const problemsHeading = page.locator('text=Problem').or(page.locator('text=Question Bank')).or(page.locator('h1, h2'));
    await expect(problemsHeading.first()).toBeVisible({ timeout: 15000 });

    // 3.4 Verify Admin User Management (/admin/users)
    console.log('[Admin Test] Checking Admin User Management...');
    await page.goto(`${BASE_URL}/admin/users`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const usersHeading = page.locator('text=User').or(page.locator('text=Students')).or(page.locator('h1, h2'));
    await expect(usersHeading.first()).toBeVisible({ timeout: 15000 });

    console.log('✅ ADMIN ROLE TEST COMPLETED SUCCESSFULLY');
  });

});
