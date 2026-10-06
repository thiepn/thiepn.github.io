import {defineConfig,devices} from '@playwright/test';
export default defineConfig({testDir:'./tests/hub-reading-pilot',workers:1,retries:0,timeout:20000,use:{headless:true,trace:'off'},projects:[
 ...(['chromium','firefox','webkit'] as const).map(browserName=>({name:browserName,testMatch:'desktop.spec.ts',use:{browserName}})),
 {name:'android-preview',testMatch:['desktop.spec.ts','mobile.spec.ts'],use:{...devices['Pixel 7'],browserName:'chromium'}},
 {name:'ipad-preview',testMatch:['desktop.spec.ts','mobile.spec.ts'],use:{...devices['iPad (gen 7)'],browserName:'webkit'}},
]});
