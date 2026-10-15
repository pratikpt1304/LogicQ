import { defineConfig, devices } from '@playwright/test';

process.env.PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = 'true';

export default defineConfig({
  testDir: './tests-e2e',
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false,
  reporter: 'list',
  use: {
    trace: 'off',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
      },
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 13'],
      },
    },
  ],
});
