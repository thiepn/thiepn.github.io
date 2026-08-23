import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const config = JSON.parse(await fs.readFile('visual-regression.config.json','utf8'));
const outDir = path.resolve('artifacts/visual/current');
await fs.rm(outDir,{recursive:true,force:true});
await fs.mkdir(outDir,{recursive:true});

const port = 4323;
const isWindows = process.platform === 'win32';
const server = spawn(isWindows ? 'npm.cmd' : 'npm',['run','preview','--','--host','127.0.0.1','--port',String(port)],{
  stdio:['ignore','pipe','pipe'],
  detached: !isWindows,
});
let serverOutput='';
server.stdout.on('data',(d)=>serverOutput+=d);
server.stderr.on('data',(d)=>serverOutput+=d);
const baseURL=`http://127.0.0.1:${port}`;
const sleep=(milliseconds)=>new Promise((resolve)=>setTimeout(resolve,milliseconds));
const waitForServer=async()=>{for(let i=0;i<80;i++){try{const r=await fetch(baseURL);if(r.ok)return;}catch{}await sleep(250);}throw new Error(`Preview server failed to start. ${serverOutput}`)};

function waitForServerExit(timeout=2000){
  if(server.exitCode!==null||server.signalCode!==null)return Promise.resolve(true);
  return new Promise((resolve)=>{
    const timer=setTimeout(()=>{server.off('exit',onExit);resolve(false);},timeout);
    const onExit=()=>{clearTimeout(timer);resolve(true);};
    server.once('exit',onExit);
  });
}

async function stopServer(){
  if(server.exitCode!==null||server.signalCode!==null)return;
  if(isWindows){
    if(!server.pid)return;
    await new Promise((resolve)=>{
      const killer=spawn('taskkill',['/pid',String(server.pid),'/T','/F'],{stdio:'ignore'});
      killer.once('error',resolve);
      killer.once('exit',resolve);
    });
    await waitForServerExit(1000);
    return;
  }
  if(!server.pid)return;
  try{process.kill(-server.pid,'SIGTERM');}catch(error){if(error?.code!=='ESRCH')throw error;}
  if(await waitForServerExit())return;
  try{process.kill(-server.pid,'SIGKILL');}catch(error){if(error?.code!=='ESRCH')throw error;}
  await waitForServerExit(1000);
}

let browser;
try {
  await waitForServer();
  browser = await chromium.launch({headless:true});
  for (const target of config.targets) {
    const viewport = target.viewport === 'mobile' ? config.mobileViewport : config.referenceViewport;
    const context = await browser.newContext({viewport,colorScheme:target.theme,reducedMotion:'reduce'});
    try {
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
      await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}*{content-visibility:visible!important}'});
      await page.screenshot({path:path.join(outDir,`${target.id}.png`),fullPage:true,animations:'disabled'});
      console.log(`captured ${target.id}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser?.close().catch(()=>{});
  await stopServer();
}
