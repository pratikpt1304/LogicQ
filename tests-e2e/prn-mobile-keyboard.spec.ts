import { test, expect } from '@playwright/test';
import http from 'http';
import fs from 'fs';
import path from 'path';

let server: http.Server;
let port: number = 0;
let baseUrl: string = '';

test.beforeAll(async () => {
  const distDir = path.resolve(__dirname, '../client/dist');
  const indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');

  server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url || '/', 'http://localhost');
    let filePath = path.join(distDir, parsedUrl.pathname);

    // Security headers matching firebase.json
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
      else if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
      else if (filePath.endsWith('.json') || filePath.endsWith('.webmanifest')) res.setHeader('Content-Type', 'application/json');
      else if (filePath.endsWith('.svg')) res.setHeader('Content-Type', 'image/svg+xml');
      res.writeHead(200);
      res.end(fs.readFileSync(filePath));
    } else {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.writeHead(200);
      res.end(indexHtml);
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      const addr = server.address();
      if (typeof addr === 'object' && addr) {
        port = addr.port;
        baseUrl = `http://localhost:${port}`;
      }
      resolve();
    });
  });
});

test.afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test.describe('PRN Mobile Alphanumeric Keyboard & Input Verification Suite', () => {
  test('1. Regression Guard: Source code verification ensures zero PRN inputs use numeric/tel modes', async () => {
    const clientPagesDir = path.resolve(__dirname, '../client/src/pages');
    const sourceFiles = [
      path.join(clientPagesDir, 'CompleteProfilePage.tsx'),
      path.join(clientPagesDir, 'RegisterPage.tsx'),
      path.join(clientPagesDir, 'ProfilePage.tsx'),
      path.join(clientPagesDir, 'admin/AdminDashboardPage.tsx'),
    ];

    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, 'utf8');
      // Assert no inputMode="numeric" on PRN inputs
      expect(content).not.toMatch(/id="[^"]*prn[^"]*"[^>]*inputMode=["']numeric["']/i);
      expect(content).not.toMatch(/name="prn"[^>]*inputMode=["']numeric["']/i);
      // Assert no type="number" or type="tel" on PRN inputs
      expect(content).not.toMatch(/id="[^"]*prn[^"]*"[^>]*type=["']number["']/i);
      expect(content).not.toMatch(/id="[^"]*prn[^"]*"[^>]*type=["']tel["']/i);
      expect(content).not.toMatch(/name="prn"[^>]*type=["']number["']/i);
      expect(content).not.toMatch(/name="prn"[^>]*type=["']tel["']/i);
    }
  });

  test('2. Register Page: Mobile alphanumeric attributes, live uppercase conversion, and counter', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(`${baseUrl}/register`, { waitUntil: 'networkidle' });

    const prnInput = page.locator('#prn-input');
    await expect(prnInput).toBeVisible();

    // Verify keyboard attributes
    await expect(prnInput).toHaveAttribute('type', 'text');
    await expect(prnInput).toHaveAttribute('inputmode', 'text');
    await expect(prnInput).toHaveAttribute('autocapitalize', 'characters');
    await expect(prnInput).toHaveAttribute('autocomplete', 'off');
    await expect(prnInput).toHaveAttribute('autocorrect', 'off');
    await expect(prnInput).toHaveAttribute('spellcheck', 'false');
    await expect(prnInput).toHaveAttribute('maxlength', '12');
    await expect(prnInput).toHaveAttribute('enterkeyhint', 'next');
    await expect(prnInput).toHaveAttribute('placeholder', '2199TESM0001');

    // Type lowercase text and verify it converts to uppercase in JS
    await prnInput.fill('2199tesm0001');
    await expect(prnInput).toHaveValue('2199TESM0001');

    // Check live counter
    const counter = page.locator('[data-testid="prn-counter"]');
    await expect(counter).toHaveText('12/12');

    // Check visual format guide blocks
    await expect(page.locator('[data-testid="prn-seg-0"]')).toHaveText('2199');
    await expect(page.locator('[data-testid="prn-seg-1"]')).toHaveText('TES');
    await expect(page.locator('[data-testid="prn-seg-2"]')).toHaveText('M');
    await expect(page.locator('[data-testid="prn-seg-3"]')).toHaveText('0001');
  });

  test('3. Register Page: Paste with spaces trims automatically', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(`${baseUrl}/register`, { waitUntil: 'networkidle' });

    const prnInput = page.locator('#prn-input');
    await prnInput.focus();

    // Simulate paste event with spaces
    await page.evaluate(() => {
      const input = document.getElementById('prn-input') as HTMLInputElement;
      const pasteEvent = new Event('paste', { bubbles: true, cancelable: true }) as any;
      pasteEvent.clipboardData = {
        getData: (type: string) => (type === 'text' ? '  2199 TESF 0002  ' : ''),
      };
      input.dispatchEvent(pasteEvent);
    });

    await expect(prnInput).toHaveValue('2199TESF0002');
    await expect(page.locator('[data-testid="prn-counter"]')).toHaveText('12/12');
  });

  test('4. Register Page: Validation accepts 2199TESM0001 and 2199TESF0002, rejects wrong shapes', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(`${baseUrl}/register`, { waitUntil: 'networkidle' });

    const prnInput = page.locator('#prn-input');
    const submitBtn = page.getByRole('button', { name: /create challenger profile/i });

    // Test wrong shape 1: All digits (old format)
    await prnInput.fill('123456789012');
    await submitBtn.click();
    await expect(page.locator('#prn-error')).toBeVisible();
    await expect(page.locator('#prn-error')).toContainText('4 digits, 3 letters, M or F, then 4 digits');

    // Test wrong shape 2: Invalid M/F slot (e.g. X)
    await prnInput.fill('2199TESX0001');
    await submitBtn.click();
    await expect(page.locator('#prn-error')).toBeVisible();

    // Test valid shape 1: 2199TESM0001 (M)
    await prnInput.fill('2199TESM0001');
    await submitBtn.click();
    // PRN error must disappear
    await expect(page.locator('#prn-error')).not.toBeVisible();

    // Test valid shape 2: 2199TESF0002 (F)
    await prnInput.fill('2199TESF0002');
    await submitBtn.click();
    await expect(page.locator('#prn-error')).not.toBeVisible();
  });

  test('5. Register Page: Zero layout overflow at 360px viewport in Dark and Light themes', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(`${baseUrl}/register`, { waitUntil: 'networkidle' });

    // Check Dark theme overflow
    const hasDarkOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasDarkOverflow).toBe(false);

    // Switch to Light theme
    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    });

    // Check Light theme overflow
    const hasLightOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasLightOverflow).toBe(false);
  });

  test('6. Complete Profile Page: Alphanumeric attributes, uppercase conversion, and format guide', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });

    // Seed mock uncompleted user session
    await page.addInitScript(() => {
      (window as any).__E2E_MOCK_USER__ = {
        id: 'test-student-e2e',
        uid: 'test-student-e2e',
        email: 'student_e2e@sanjivani.edu.in',
        displayName: 'Test Student',
        role: 'STUDENT',
        profileComplete: false,
      };
    });

    await page.goto(`${baseUrl}/complete-profile`, { waitUntil: 'networkidle' });

    const prnInput = page.locator('#complete-prn-input');
    await expect(prnInput).toBeVisible();

    // Verify keyboard attributes
    await expect(prnInput).toHaveAttribute('type', 'text');
    await expect(prnInput).toHaveAttribute('inputmode', 'text');
    await expect(prnInput).toHaveAttribute('autocapitalize', 'characters');
    await expect(prnInput).toHaveAttribute('autocomplete', 'off');
    await expect(prnInput).toHaveAttribute('autocorrect', 'off');
    await expect(prnInput).toHaveAttribute('spellcheck', 'false');
    await expect(prnInput).toHaveAttribute('maxlength', '12');
    await expect(prnInput).toHaveAttribute('enterkeyhint', 'next');
    await expect(prnInput).toHaveAttribute('placeholder', '2199TESM0001');

    // Type lowercase text and verify it converts to uppercase in JS
    await prnInput.fill('2199tesf0002');
    await expect(prnInput).toHaveValue('2199TESF0002');

    // Check live counter
    const counter = page.locator('[data-testid="complete-prn-counter"]');
    await expect(counter).toHaveText('12/12');

    // Check format guide segment highlight
    await expect(page.locator('[data-testid="prn-seg-0"]')).toHaveText('2199');
    await expect(page.locator('[data-testid="prn-seg-1"]')).toHaveText('TES');
    await expect(page.locator('[data-testid="prn-seg-2"]')).toHaveText('F');
    await expect(page.locator('[data-testid="prn-seg-3"]')).toHaveText('0002');

    // Verify zero horizontal overflow at 360px
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasOverflow).toBe(false);
  });
});
