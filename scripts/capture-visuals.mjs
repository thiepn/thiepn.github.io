import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const config = JSON.parse(await fs.readFile('visual-regression.config.json','utf8'));
const outDir = path.resolve('artifacts/visual/current');
await fs.rm(outDir,{recursive:true,force:true});
await fs.mkdir(outDir,{recursive:true});
const port = 4323;
const server = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm',['run','preview','--','--host','127.0.0.1','--port',String(port)],{stdio:['ignore','pipe','pipe']});
let serverOutput=''; server.stdout.on('data',(d)=>serverOutput+=d); server.stderr.on('data',(d)=>serverOutput+=d);
const baseURL=`http://127.0.0.1:${port}`;
const waitForServer=async()=>{for(let i=0;i<80;i++){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,250));}throw new Error(`Preview server failed to start. ${serverOutput}`)};
try {
  await waitForServer();
  const browser = await chromium.launch({headless:true});
  for (const target of config.targets) {
    const viewport = target.viewport === 'mobile' ? config.mobileViewport : config.referenceViewport;
    const context = await browser.newContext({viewport,colorScheme:target.theme,reducedMotion:'reduce'});
    await context.addInitScript((theme)=>localStorage.setItem('thiepn:index-theme',theme),target.theme);
    const page=await context.newPage();
    await page.goto(`${baseURL}${target.path}`,{waitUntil:'networkidle'});
    await page.evaluate(()=>document.fonts?.ready);
    if(target.state==='search'){
      await page.keyboard.press('Control+K');
      const input=page.getByRole('combobox',{name:'Search projects and collections'});
      await input.fill(target.query ?? 'analysis');
      await page.waitForTimeout(100);
    }
    await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}'});
    await page.screenshot({path:path.join(outDir,`${target.id}.png`),fullPage:true,animations:'disabled'});
    await context.close();
    console.log(`captured ${target.id}`);
  }
  await browser.close();
} finally {
  server.kill('SIGTERM');
}
