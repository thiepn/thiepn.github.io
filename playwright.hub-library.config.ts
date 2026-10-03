import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests/hub-library', workers: 1, retries: 0, timeout: 20000, use: { headless: true, trace: 'off' }, projects: ['chromium','firefox','webkit'].map(browserName => ({ name: browserName, use: { browserName: browserName as 'chromium' | 'firefox' | 'webkit' } })) });
