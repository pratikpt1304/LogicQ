import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import fs from 'fs';
import path from 'path';

describe('Cross-Origin-Opener-Policy & Defensive Security Headers Suite', () => {
  it('1. Express API server sets Cross-Origin-Opener-Policy to same-origin-allow-popups', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.headers['cross-origin-opener-policy']).toBe('same-origin-allow-popups');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(res.headers['cross-origin-embedder-policy']).toBeUndefined();
  });

  it('2. firebase.json specifies same-origin-allow-popups without weakening CSP or existing headers', () => {
    const firebaseJsonPath = path.resolve(__dirname, '../../firebase.json');
    expect(fs.existsSync(firebaseJsonPath)).toBe(true);

    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseJsonPath, 'utf8'));
    const allHeaders = firebaseConfig.hosting.headers;
    const globalHeaderBlock = allHeaders.find((h: any) => h.source === '**');

    expect(globalHeaderBlock).toBeDefined();
    const headersMap = Object.fromEntries(
      globalHeaderBlock.headers.map((h: any) => [h.key, h.value])
    );

    // COOP must be same-origin-allow-popups
    expect(headersMap['Cross-Origin-Opener-Policy']).toBe('same-origin-allow-popups');

    // COEP must not be require-corp
    expect(headersMap['Cross-Origin-Embedder-Policy']).toBeUndefined();

    // HSTS, nosniff, frame protection, referrer policy must be intact
    expect(headersMap['Strict-Transport-Security']).toContain('max-age=31536000');
    expect(headersMap['X-Content-Type-Options']).toBe('nosniff');
    expect(headersMap['X-Frame-Options']).toBe('DENY');
    expect(headersMap['Referrer-Policy']).toBe('strict-origin-when-cross-origin');

    // CSP must allow accounts.google.com and *.firebaseapp.com frame-src for Google sign-in popup & handler
    const csp = headersMap['Content-Security-Policy'];
    expect(csp).toBeDefined();
    expect(csp).toContain('frame-src');
    expect(csp).toContain('https://accounts.google.com');
    expect(csp).toContain('https://*.firebaseapp.com');
  });

  it('3. client/vite.config.ts configures COOP headers for both dev and preview servers', () => {
    const viteConfigPath = path.resolve(__dirname, '../../client/vite.config.ts');
    expect(fs.existsSync(viteConfigPath)).toBe(true);

    const viteContent = fs.readFileSync(viteConfigPath, 'utf8');
    expect(viteContent).toContain("'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'");
    expect(viteContent).toContain('server:');
    expect(viteContent).toContain('preview:');
  });
});
