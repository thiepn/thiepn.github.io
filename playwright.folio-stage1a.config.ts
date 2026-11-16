import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/studio',
  testMatch: 'hub-folio-paired-stage1a.spec.ts',
  fullyParallel: false,
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', {outputFolder:'playwright-report/folio-paired', open:'never'}]],
  use: {
    baseURL: 'http://127.0.0.1:4321',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block',
  },
  projects: [
    {name:'desktop-chromium',use:{...devices['Desktop Chrome']}},
    {name:'desktop-firefox',use:{...devices['Desktop Firefox']}},
    {name:'mobile-chromium-390',use:{...devices['Pixel 7'],viewport:{width:390,height:844}}},
    {name:'mobile-webkit',use:{...devices['iPhone 13']}},
    {name:'narrow-chromium-320',use:{...devices['Desktop Chrome'],viewport:{width:320,height:720},hasTouch:true}},
  ],
  webServer: {
    command: 'python3 -m http.server 4321 --bind 127.0.0.1 --directory dist',
    url: 'http://127.0.0.1:4321/home/tasks/',
    timeout: 30_000,
    reuseExistingServer: false,
  },
});
