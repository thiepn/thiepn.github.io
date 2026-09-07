import { chromium } from '@playwright/test';
import fs from 'node:fs';
import sharp from 'sharp';
const browser=await chromium.launch();
const out='workflow-state-evidence';fs.mkdirSync(out,{recursive:true});
const rows=[];
async function capture(slug,url,action,file){
 const context=await browser.newContext({viewport:{width:1440,height:960},colorScheme:'light'});const page=await context.newPage();page.setDefaultTimeout(15000);
 const row={slug,url,capturedAt:new Date().toISOString(),errors:[]};page.on('pageerror',e=>row.errors.push(e.message));
 try{
  await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForTimeout(700);await action(page);
  await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(700);
  row.text=(await page.locator('body').innerText()).slice(0,18000);
  const bytes=await page.screenshot();fs.writeFileSync(`${out}/${slug}.png`,bytes);
  await sharp(bytes).resize({width:1440,withoutEnlargement:true}).webp({quality:88}).toFile('public'+file);
  row.file=file;row.success=true;
 }catch(e){row.error=e.message;row.text=(await page.locator('body').innerText()).slice(0,16000);await page.screenshot({path:`${out}/${slug}-error.png`});}
 rows.push(row);await context.close();
}
await capture('manuscript','https://thiepn.dev/manuscript/',async page=>{
 await page.getByRole('button',{name:'Start Writing',exact:true}).click();
 await page.locator('[data-action="onboarding-sample"]').filter({visible:true}).click();
 await page.waitForFunction(()=>document.documentElement.dataset.screen==='editor');
 await page.locator('[data-workspace="split"]').click();await page.waitForTimeout(2500);
 await page.locator('.preview-pane').waitFor({state:'visible'});
 await page.evaluate(()=>{for(const e of document.querySelectorAll('.cm-scroller,.preview-scroll'))e.scrollTop=0;});
},'/projects/manuscript/showcase-editor.webp');
await capture('wordstrike','https://thiepn.dev/wordstrike/',async page=>{
 const close=page.getByRole('button',{name:'Close tutorial'});if(await close.isVisible())await close.click();
 await page.getByRole('button',{name:'START',exact:true}).click();
 await page.locator('button:visible').filter({hasText:/endless/i}).first().click();
 if(await close.isVisible())await close.click();
 await page.locator('[data-action="endless-start"]').click();
 await page.locator('.endless-screen').waitFor({state:'visible'});await page.waitForTimeout(2800);
},'/projects/wordstrike/showcase-run.webp');
for(const id of ['text-cleaner','json-formatter','image-converter','qr-studio']){
 const context=await browser.newContext();const page=await context.newPage();const row={tool:id,url:`https://thiepn.dev/tools/#/tool/${id}`};
 try{const response=await page.goto(row.url,{waitUntil:'domcontentloaded'});await page.waitForTimeout(1100);row.status=response.status();row.headings=await page.locator('h1,h2').allTextContents();row.text=(await page.locator('main').innerText()).slice(0,2500);row.success=row.status===200&&!row.text.includes('Tool not found');}catch(e){row.error=e.message;}
 rows.push(row);await context.close();
}
fs.writeFileSync(`${out}/results.json`,JSON.stringify(rows,null,2));
await browser.close();
if(rows.some(r=>!r.success))process.exitCode=1;
