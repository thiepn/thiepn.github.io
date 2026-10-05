import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/hub-workflows', workers: 1, retries: 0, timeout: 30000,
  use: { headless: true, trace: 'off' },
  projects: [
    ...(['chromium', 'firefox', 'webkit'] as const).map(browserName => ({ name: browserName, use: { browserName } })),
    { name: 'android-chrome-emulated', use: { ...devices['Pixel 7'], browserName: 'chromium' } },
    { name: 'ipad-safari-emulated', use: { ...devices['iPad (gen 7)'], browserName: 'webkit' } },
  ],
});
