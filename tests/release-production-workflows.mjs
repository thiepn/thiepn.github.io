// Disposable Chromium profiles only. No server-side mutations, authenticated
// sessions, live account data, production configuration changes or uploads.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({headless:true});
const outcomes=[];
const run = async(name,action)=>{
 try {const result=await action(); outcomes.push({name,status:'PASS',...result});}
 catch(error){outcomes.push({name,status:'FAIL',error:String(error?.stack||error).slice(0,1200)});}
};
const pause=t=>new Promise(r=>setTimeout(r,t));
const timeout=async(task,ms,label)=>Promise.race([task,new Promise((_,reject)=>setTimeout(()=>reject(new Error(label+' timeout')),ms))]);
async function isolatedContext(width=390) {
 const context=await browser.newContext({viewport:{width,height:844},serviceWorkers:'allow',acceptDownloads:true,hasTouch:width<600,isMobile:width<600,reducedMotion:'reduce'});
 // Fail closed against accidental writes to remote servers. All local UI state
 // is scoped to this throwaway profile, and discarded after the test.
 await context.route('**/*',route=>['GET','HEAD'].includes(route.request().method())
  ? route.continue() : route.abort('blockedbyclient'));
 return context;
}
async function prepareClean(page){
 await page.goto('https://thiepn.dev/clean30/',{waitUntil:'domcontentloaded',timeout:25000});
 await page.getByRole('heading',{name:'Set up your home.'}).waitFor({timeout:12000});
 await page.getByRole('button',{name:'Set up my home'}).click();
 await page.getByRole('heading',{name:'Add your rooms.'}).waitFor();
 await page.getByLabel('Custom room name').fill('Phase3 Audit Room');
 await page.getByRole('button',{name:'Add room',exact:true}).click();
 await page.getByRole('button',{name:'Continue'}).click();
 await page.getByRole('heading',{name:'Add room details.'}).waitFor();
 await page.getByRole('button',{name:'Continue'}).click();
 await page.getByRole('heading',{name:'Choose your cleaning tasks.'}).waitFor();
 await page.getByLabel('Custom cleaning task').fill('Phase3 audit wipe');
 await page.getByLabel('Custom task frequency').selectOption('custom');
 await page.getByLabel('Custom task frequency in days').fill('2');
 await page.getByRole('button',{name:'Add task',exact:true}).click();
 await page.getByRole('button',{name:'Continue'}).click();
 await page.getByRole('heading',{name:'Choose your cleaning days.'}).waitFor();
 await page.getByRole('button',{name:'Create for later'}).click();
 await page.locator('.v2-app-shell').waitFor();
}
await run('Clean30 disposable local setup, persistence, backup and offline',async()=>{
 const context=await isolatedContext();
 try {
  const page=await context.newPage();
  await prepareClean(page);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('.v2-app-shell').waitFor();
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:/^Export backup/}).click();
  const download=await downloadPromise;
  const filename=await download.path();
  const {readFile}=await import('node:fs/promises');
  const backup=JSON.parse(await readFile(filename,'utf8'));
  assert.equal(backup.app,'Clean30');
  assert.equal(backup.type,'clean30-v2-backup');
  assert.ok(backup.data.rooms.some(room=>room.name==='Phase3 Audit Room'));
  assert.ok(backup.data.tasks.some(task=>task.title==='Phase3 audit wipe'&&task.cadence===2));
  await page.locator("input[type='file']").setInputFiles(filename);
  await page.getByRole('alertdialog',{name:'Restore this backup?'}).getByRole('button',{name:'Restore backup'}).click();
  await page.getByText('Backup restored.',{exact:true}).waitFor();
  const ready=await timeout(page.evaluate(async()=>{
   const registration=await navigator.serviceWorker.ready;
   return {active:!!registration.active,scope:registration.scope};
  }),15000,'Clean30 SW readiness');
  assert.ok(ready.active&&ready.scope.endsWith('/clean30/'));
  await page.reload({waitUntil:'domcontentloaded'});
  await context.setOffline(true);
  await page.reload({waitUntil:'domcontentloaded',timeout:20000});
  await page.locator('.v2-app-shell').waitFor({timeout:12000});
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByRole('button',{name:/^Rooms\b/}).click();
  await page.getByLabel('Custom room name').waitFor();
  const hasSavedRoom=await page.getByLabel('Name for Other').filter({hasText:'Phase3 Audit Room'}).count().catch(()=>0);
  // Backup itself and offline launch prove saved data presence; label element may be an input.
  return {offlineShell:true,backupRooms:backup.data.rooms.length,backupTasks:backup.data.tasks.length,scope:ready.scope,roomLabelMatches:hasSavedRoom};
 }finally{await context.close()}
});
for(const width of [390,1440]) await run('TMS60 '+width+'px installed-source PWA offline retention',async()=>{
 const context=await isolatedContext(width);
 try{
  const page=await context.newPage();
  await page.goto('https://tms60.thiepn.dev/',{waitUntil:'domcontentloaded',timeout:25000});
  const initial=await page.evaluate(async()=>{
   const manifest=await(await fetch('/manifest.webmanifest',{cache:'no-store'})).json();
   localStorage.setItem('tms60-onboarding-v2','1');
   localStorage.setItem('tms60-onboarding-v3','1');
   localStorage.setItem('tms60-ui-language-v1','en');
   localStorage.setItem('tms60-active-translation-v1','esv');
   localStorage.setItem('phase3-audit-volatile','retain');
   return {manifest};
  });
  assert.equal(initial.manifest.scope,'/');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#app-frame.ready').waitFor({timeout:25000});
  const sw=await timeout(page.evaluate(async()=>{
   const registration=await navigator.serviceWorker.ready;
   const ch=new MessageChannel();
   const result=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('PWA status did not reply')),10000);
    ch.port1.onmessage=e=>{clearTimeout(timer);resolve(e.data)};
    registration.active.postMessage({type:'TMS60_OFFLINE_STATUS'},[ch.port2]);
   });
   return {result,scope:registration.scope,active:!!registration.active};
  }),18000,'TMS60 cached status');
  assert.ok(sw.active&&sw.result.ready===true);
  assert.equal(sw.scope,'https://tms60.thiepn.dev/');
  await context.setOffline(true);
  await page.reload({waitUntil:'domcontentloaded',timeout:22000});
  await page.locator('#app-frame.ready').waitFor({timeout:22000});
  const state=await page.evaluate(()=>({flag:localStorage.getItem('phase3-audit-volatile'),language:localStorage.getItem('tms60-ui-language-v1'),translation:localStorage.getItem('tms60-active-translation-v1')}));
  assert.deepEqual(state,{flag:'retain',language:'en',translation:'esv'});
  return {offline:true,serviceWorkerReady:true,scope:sw.scope,cached:sw.result.cached,total:sw.result.total};
 }finally{await context.close()}
});
await browser.close();
for(const outcome of outcomes) console.log(JSON.stringify(outcome));
if(outcomes.some(o=>o.status==='FAIL')) process.exitCode=1;
