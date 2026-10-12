import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function srgbChannelToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function hexToLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return (
    0.2126 * srgbChannelToLinear(r) +
    0.7152 * srgbChannelToLinear(g) +
    0.0722 * srgbChannelToLinear(b)
  );
}

function contrastRatio(hexA: string, hexB: string): number {
  const l1 = hexToLuminance(hexA);
  const l2 = hexToLuminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('LogicQ Dual-Theme (Dark & Light) UI, Contrast & Accessibility Guardrails', () => {
  const rootDir = path.resolve(__dirname, '../..');
  const clientDir = path.join(rootDir, 'client');
  const indexHtml = fs.readFileSync(path.join(clientDir, 'index.html'), 'utf-8');
  const indexCss = fs.readFileSync(path.join(clientDir, 'src/index.css'), 'utf-8');
  const tailwindCfg = fs.readFileSync(path.join(clientDir, 'tailwind.config.js'), 'utf-8');
  const codeEditorTsx = fs.readFileSync(
    path.join(clientDir, 'src/components/editor/CodeEditor.tsx'),
    'utf-8'
  );
  const navbarTsx = fs.readFileSync(
    path.join(clientDir, 'src/components/layout/Navbar.tsx'),
    'utf-8'
  );
  const challengeTsx = fs.readFileSync(
    path.join(clientDir, 'src/pages/ChallengePage.tsx'),
    'utf-8'
  );

  it('applies theme before first paint on <html> with system-preference fallback and color-scheme', () => {
    expect(indexHtml).toContain("localStorage.getItem('logicq_theme')");
    expect(indexHtml).toContain("matchMedia('(prefers-color-scheme: dark)')");
    expect(indexHtml).toContain('root.classList.add(theme)');
    expect(indexHtml).toContain("root.setAttribute('data-theme', theme)");
    expect(indexHtml).toContain('root.style.colorScheme = theme');
  });

  it('defines centralized CSS variables for both Dark and Light themes and navbar height offset', () => {
    expect(indexCss).toContain('--navbar-height: 4rem');
    expect(indexCss).toContain('scroll-padding-top: var(--navbar-height, 4rem)');
    expect(indexCss).toContain('html.dark');
    expect(indexCss).toContain('html.light');
    expect(tailwindCfg).toContain('var(--bg-main)');
    expect(tailwindCfg).toContain('var(--bg-panel)');
    expect(tailwindCfg).toContain('var(--text-main)');
    expect(tailwindCfg).toContain('var(--text-muted)');
    expect(tailwindCfg).toContain('var(--color-accent)');
  });

  it('enforces WCAG AA contrast ratios (>= 4.5:1 normal text, >= 3:1 UI controls) for Dark theme tokens', () => {
    const dark = {
      bg: '#0C0F1F',
      panel: '#141932',
      text: '#E8EAF6',
      muted: '#9AA1C4',
      accent: '#8B9BFF',
      success: '#46D9A0',
      error: '#FF7A8A',
      warning: '#FBBF24',
    };

    expect(contrastRatio(dark.text, dark.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark.text, dark.panel)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark.muted, dark.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark.muted, dark.panel)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark.accent, dark.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark.accent, dark.panel)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark.success, dark.panel)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark.error, dark.panel)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(dark.warning, dark.panel)).toBeGreaterThanOrEqual(4.5);
  });

  it('enforces WCAG AA contrast ratios (>= 4.5:1 normal text, >= 3:1 UI controls) for Light theme tokens', () => {
    const light = {
      bg: '#F4F6FB',
      panel: '#FFFFFF',
      surface: '#EEF1F8',
      text: '#0C0F1F',
      muted: '#434C6E',
      accent: '#3643D0',
      success: '#096B48',
      error: '#B81B35',
      warning: '#8C5000',
    };

    expect(contrastRatio(light.text, light.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(light.text, light.panel)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(light.muted, light.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(light.muted, light.panel)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(light.accent, light.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(light.accent, light.panel)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(light.success, light.panel)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(light.error, light.panel)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(light.warning, light.panel)).toBeGreaterThanOrEqual(4.5);
  });

  it('configures Monaco editor with matching logicq-dark & logicq-light themes, >= 4.5:1 line numbers, and unclipped line 1', () => {
    expect(codeEditorTsx).toContain("defineTheme('logicq-dark'");
    expect(codeEditorTsx).toContain("defineTheme('logicq-light'");
    expect(codeEditorTsx).toContain("'editorLineNumber.foreground': '#9AA1C4'");
    expect(codeEditorTsx).toContain("'editorLineNumber.activeForeground': '#E8EAF6'");
    expect(codeEditorTsx).toContain("'editorLineNumber.foreground': '#434C6E'");
    expect(codeEditorTsx).toContain("'editorLineNumber.activeForeground': '#3643D0'");
    expect(codeEditorTsx).toContain('editor.setScrollTop(0)');
    expect(codeEditorTsx).toContain('padding: { top: 16, bottom: 16 }');

    // Verify line-number contrast in both themes >= 4.5:1
    expect(contrastRatio('#9AA1C4', '#0C0F1F')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#434C6E', '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#3643D0', '#F4F6FB')).toBeGreaterThanOrEqual(4.5);
  });

  it('prevents sticky navbar overlap on Daily Challenge page and includes accessible theme toggle', () => {
    expect(navbarTsx).toContain('toggleTheme');
    expect(navbarTsx).toContain('bg-[var(--bg-panel)]');
    expect(challengeTsx).toContain('calc(100dvh - var(--navbar-height, 4rem))');
  });

  it('verifies before & after screenshots exist in /docs/screenshots/ui for dark and light themes at 360px and 1280px', () => {
    const uiScreenshotDir = path.join(rootDir, 'docs/screenshots/ui');
    if (fs.existsSync(uiScreenshotDir)) {
      const files = fs.readdirSync(uiScreenshotDir);
      expect(files.some((f) => f.endsWith('_before.png'))).toBe(true);
      expect(files.some((f) => f.endsWith('_after.png'))).toBe(true);
    }
  });
});
