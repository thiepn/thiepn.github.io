import { defineConfig, devices } from '@playwright/test';

const desktop = {
  viewport: { width: 1440, height: 900 },
};
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  ...(isCI ? { workers: 1 } : {}),
  reporter: isCI ? 'github' : 'list',
  expect: { timeout: 7_500 },
  use: {
    baseURL: 'http://127.0.0.1:4321',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], ...desktop },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], ...desktop },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'], ...desktop },
    },
    {
      name: 'mobile-chromium',
      grep: /@mobile-cert/,
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: 1,
      },
    },
    {
      name: 'mobile-webkit',
      grep: /@mobile-cert/,
      use: {
        browserName: 'webkit',
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
        deviceScaleFactor: 1,
      },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4321',
    url: 'http://127.0.0.1:4321',
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
