import {defineConfig,devices} from '@playwright/test';
const chromiumLaunch=process.env.HUB_CHROMIUM_PATH?{executablePath:process.env.HUB_CHROMIUM_PATH}:{};
export default defineConfig({testDir:'./tests/hub-reading-pilot',workers:1,retries:0,timeout:20000,use:{headless:true,trace:'off'},projects:[
 ...(['chromium','firefox','webkit'] as const).map(browserName=>({name:browserName,testMatch:'desktop.spec.ts',use:{browserName,...(browserName==='chromium'?{launchOptions:chromiumLaunch}:{})}})),
 {name:'android-preview',testMatch:['desktop.spec.ts','mobile.spec.ts'],use:{...devices['Pixel 7'],browserName:'chromium',launchOptions:chromiumLaunch}},
 {name:'ipad-preview',testMatch:['desktop.spec.ts','mobile.spec.ts'],use:{...devices['iPad (gen 7)'],browserName:'webkit'}},
]});
