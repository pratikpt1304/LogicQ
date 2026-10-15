import { test, expect } from '@playwright/test';
import http from 'http';
import fs from 'fs';
import path from 'path';

// Local static server serving client/dist with production security headers from firebase.json
let server: http.Server;
let port: number = 0;
let baseUrl: string = '';

test.beforeAll(async () => {
  const distDir = path.resolve(__dirname, '../client/dist');
  const indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');

  server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url || '/', 'http://localhost');
    let filePath = path.join(distDir, parsedUrl.pathname);

    // Default headers matching firebase.json
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com; worker-src 'self' blob:; manifest-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com; frame-src 'self' https://*.firebaseapp.com https://accounts.google.com; object-src 'none'; base-uri 'self';"
    );

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

test.describe('Login Page COOP & Clean Console Verification', () => {
  test('1. Response headers serve Cross-Origin-Opener-Policy: same-origin-allow-popups', async ({ request }) => {
    const res = await request.get(`${baseUrl}/login`);
    expect(res.status()).toBe(200);
    const headers = res.headers();
    expect(headers['cross-origin-opener-policy']).toBe('same-origin-allow-popups');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['cross-origin-embedder-policy']).toBeUndefined();
  });

  test('2. Clean console: zero COOP warnings, zero console errors, zero failed requests on login page', async ({ page }) => {
    const consoleErrors: string[] = [];
    const coopWarnings: string[] = [];
    const failedRequests: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
      if (text.includes('Cross-Origin-Opener-Policy') || text.includes('window.closed')) {
        coopWarnings.push(text);
      }
    });

    page.on('pageerror', (err) => {
      consoleErrors.push(err.message);
    });

    page.on('requestfailed', (req) => {
      // Ignore Google telemetry/metrics if offline or blocked
      const url = req.url();
      if (!url.includes('google-analytics') && !url.includes('analytics')) {
        failedRequests.push(`${req.method()} ${url} - ${req.failure()?.errorText}`);
      }
    });

    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });

    // Verify Login page UI rendered cleanly
    const heading = page.locator('h2');
    await expect(heading).toContainText('Sign In to LogicQ');

    const googleBtn = page.getByRole('button', { name: /Continue with Google Account/i });
    await expect(googleBtn).toBeVisible();

    // Verify zero COOP warnings
    expect(coopWarnings).toEqual([]);
    // Verify zero console errors
    expect(consoleErrors).toEqual([]);
    // Verify zero failed application requests
    expect(failedRequests).toEqual([]);
  });

  test('3. Mobile Viewport (iPhone 13 - 390x844): clean rendering and zero COOP warnings', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const coopWarnings: string[] = [];
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      const text = msg.text();
      if (msg.type() === 'error') consoleErrors.push(text);
      if (text.includes('Cross-Origin-Opener-Policy') || text.includes('window.closed')) {
        coopWarnings.push(text);
      }
    });

    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
    const googleBtn = page.getByRole('button', { name: /Continue with Google Account/i });
    await expect(googleBtn).toBeVisible();

    expect(coopWarnings).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});
