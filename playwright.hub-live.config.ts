import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/hub-live', workers: 2, retries: 0, timeout: 30000,
  reporter: [['list'], ['json', { outputFile: 'test-results/h9-live.json' }]],
  use: { baseURL: 'https://thiepn.dev', headless: true, trace: 'off', screenshot: 'only-on-failure' },
  projects: ['chromium', 'firefox', 'webkit'].map(browserName => ({
    name: browserName, use: { browserName: browserName as 'chromium' | 'firefox' | 'webkit' },
  })),
});
