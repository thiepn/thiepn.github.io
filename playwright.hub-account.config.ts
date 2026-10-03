import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/hub-account', workers: 1, fullyParallel: false, retries: 0, timeout: 30000,
  use: { headless: true, trace: 'retain-on-failure' },
  projects: ['chromium', 'firefox', 'webkit'].map(browserName => ({
    name: browserName, use: { browserName: browserName as 'chromium' | 'firefox' | 'webkit',
      ...(browserName === 'chromium' && process.env.HUB_TEST_CHROMIUM ? { launchOptions: { executablePath: process.env.HUB_TEST_CHROMIUM, args: ['--no-sandbox','--disable-dev-shm-usage','--no-zygote'] } } : {}) },
  })),
});
