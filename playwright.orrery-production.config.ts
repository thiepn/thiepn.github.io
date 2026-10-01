import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir:'./tests/e2e',
  testMatch:'orrery-production.spec.ts',
  fullyParallel:false,
  timeout:60000,
  expect:{timeout:10000},
  retries:1,
  workers:1,
  reporter:[['list'],['junit',{outputFile:'test-results/orrery-playwright.xml'}]],
  use:{
    baseURL:process.env.ORRERY_URL||'https://thiepn.dev/orrery/',
    trace:'retain-on-failure',
    screenshot:'only-on-failure',
    serviceWorkers:'allow'
  },
  projects:[
    {name:'chromium',use:{...devices['Desktop Chrome']}},
    {name:'webkit',use:{...devices['Desktop Safari']}}
  ]
});
