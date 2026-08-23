import { defineConfig, devices } from '@playwright/test';

const desktop = {
  viewport: { width: 1440, height: 900 },
};
const isCI = Boolean(process.env.CI);
const mobileCertification = /@mobile-cert/;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  ...(isCI ? { workers: 1 } : {}),
  reporter: isCI
    ? [
        ['github'],
        ['list'],
        ['junit', { outputFile: 'test-results/playwright-junit.xml' }],
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
      ]
    : 'list',
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
      grepInvert: mobileCertification,
      use: { ...devices['Desktop Chrome'], ...desktop },
    },
    {
      name: 'firefox',
      grepInvert: mobileCertification,
      use: { ...devices['Desktop Firefox'], ...desktop },
    },
    {
      name: 'webkit',
      grepInvert: mobileCertification,
      use: { ...devices['Desktop Safari'], ...desktop },
    },
    {
      name: 'mobile-chromium',
      grep: mobileCertification,
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
      grep: mobileCertification,
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
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4321',
    url: 'http://127.0.0.1:4321',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});