import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
 testDir:'./tests/studio',fullyParallel:true,timeout:30000,retries:0,workers:3,
 reporter:[['list'],['json',{outputFile:'test-results/studio.json'}],['html',{outputFolder:'playwright-report',open:'never'}]],
 use:{baseURL:'http://127.0.0.1:4321',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[{name:'chromium',use:{...devices['Desktop Chrome']}},{name:'firefox',use:{...devices['Desktop Firefox']}},{name:'webkit',use:{...devices['Desktop Safari']}}],
 webServer:{command:'npm run preview -- --host 127.0.0.1 --port 4321',port:4321,reuseExistingServer:!process.env.CI},
});
