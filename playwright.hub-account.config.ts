import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/hub-account', workers: 1, fullyParallel: false, retries: 0, timeout: 30000,
  use: { browserName: 'chromium', headless: true, trace: 'retain-on-failure',
    launchOptions: process.env.HUB_TEST_CHROMIUM ? { executablePath: process.env.HUB_TEST_CHROMIUM, args: ['--no-sandbox','--disable-dev-shm-usage','--no-zygote'] } : {} },
});
