import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'./tests/studio',testMatch:['tracker-history.spec.ts','connected-hub.spec.ts','hub-sync.spec.ts','hub-continuity.spec.ts','workspace.spec.ts','daily-home.spec.ts','hub-foundation.spec.ts','hub-scale.spec.ts','hub-providers.spec.ts','hub-release.spec.ts','workflow-handoffs.spec.ts'],timeout:30000,workers:2,
 use:{baseURL:'http://127.0.0.1:4321',viewport:{width:1440,height:1024},timezoneId:'Europe/Berlin',trace:'retain-on-failure',launchOptions:process.env.HUB_CHROMIUM_PATH?{executablePath:process.env.HUB_CHROMIUM_PATH}:{}},
 reporter:[['list']],
 webServer:{command:'ASTRO_TELEMETRY_DISABLED=1 npm run preview -- --host 127.0.0.1 --port 4321',port:4321,reuseExistingServer:true},
});
