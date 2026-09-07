import { chromium } from '@playwright/test';
import fs from 'node:fs';
const out=process.env.EVIDENCE_DIR||'studio-evidence';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch();const records=[];
const routes=['/','/work/','/projects/','/about/','/project/micro-arcade/','/project/pdf-studio/','/project/manuscript/','/project/wordstrike/','/collections/','/collection/browser-games/','/books/','/privacy/'];
for(const route of routes)for(const width of (route==='/'?[375,768,1440,1920]:[375,1440]))for(const theme of ['light','dark']){
 const context=await browser.newContext({viewport:{width,height:900},colorScheme:theme,reducedMotion:'reduce'});const page=await context.newPage();const row={route,width,theme,errors:[]};page.on('pageerror',e=>row.errors.push(e.message));
 await page.route('**/library/media/**',async r=>{
  const path=new URL(r.request().url()).pathname;const res=await page.request.get('https://thiepn.dev'+path);
  const bytes=await res.body();const local=out+'/library-assets'+path.replace('/library/media','');fs.mkdirSync(local.slice(0,local.lastIndexOf('/')),{recursive:true});fs.writeFileSync(local,bytes);await r.fulfill({response:res});
 });
 try{
  await page.goto('http://127.0.0.1:4321'+route,{waitUntil:'networkidle'});
  const name=(route.replaceAll('/','-')||'home')+'-'+width+'-'+theme;
  row.initial=await page.evaluate(()=>({headings:[...document.querySelectorAll('h1,h2,h3')].map(e=>({text:e.textContent,y:e.getBoundingClientRect().y})),width:document.documentElement.scrollWidth,resources:performance.getEntriesByType('resource').map(r=>({url:r.name,bytes:r.transferSize,duration:r.duration}))}));
  await page.screenshot({path:out+'/'+name+'-viewport.png',animations:'disabled'});
  await page.evaluate(async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=650){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,60));}window.scrollTo(0,0);});await page.waitForTimeout(300);
  await page.screenshot({path:out+'/'+name+'-full.png',fullPage:true,animations:'disabled'});
  row.brokenImages=await page.locator('img').evaluateAll(es=>es.filter(e=>!e.complete||!e.naturalWidth).map(e=>e.currentSrc));
  if(route==='/'&&width===375&&theme==='light'){await page.getByRole('button',{name:'Menu',exact:true}).click();await page.screenshot({path:out+'/mobile-menu.png'});await page.keyboard.press('Escape');await page.keyboard.press('Control+k');await page.waitForTimeout(400);await page.screenshot({path:out+'/search.png'});}
 }catch(e){row.error=e.message;}
 records.push(row);await context.close();
}
// Real launch/first-action smoke, separate from certification of the root portfolio.
for(const [slug,action] of [['arcade','Play Orbit. Keep the satellite alive.'],['pdf','Open sample'],['manuscript','Start Writing'],['tbc','Quick Play'],['wordstrike','START']]){
 const context=await browser.newContext({viewport:{width:1440,height:900}});const page=await context.newPage();const row={app:slug,action};
 try{await page.goto('https://thiepn.dev/'+slug+'/',{waitUntil:'domcontentloaded'});await page.waitForTimeout(2000);if(slug==='wordstrike')await page.getByRole('button',{name:'Close tutorial'}).click();if(slug==='tbc'){const beginner=page.getByRole('button',{name:/1\s+Beginner/}).first();if(await beginner.isVisible())await beginner.click();await page.getByRole('button',{name:/^Quick Play/}).filter({visible:true}).first().click();}else await page.getByRole('button',{name:action,exact:true}).first().click();await page.waitForTimeout(1800);row.title=await page.title();row.text=(await page.locator('body').innerText()).slice(0,18000);await page.screenshot({path:out+'/launch-'+slug+'.png'});row.success=true;}catch(e){row.error=e.message;}records.push(row);await context.close();
}
fs.writeFileSync(out+'/capture.json',JSON.stringify(records,null,2));await browser.close();
