import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const evidence = 'showcase-media-evidence';
fs.mkdirSync(evidence, { recursive: true });
const browser = await chromium.launch();
const records = [];
async function record(name, url, action, options = {}) {
  const viewport = { width: 1200, height: 800 };
  const context = await browser.newContext({ viewport, colorScheme: 'light', ...(options.video ? { recordVideo: { dir: `${evidence}/raw-video`, size: viewport } } : {}) });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const began = Date.now();
  const row = { name, url, capturedAt: new Date().toISOString(), edits: 'Browser screenshot; no product UI or results fabricated.', errors: [] };
  page.on('pageerror', e => row.errors.push(e.message));
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1200);
    await action(page, row, began);
    await page.evaluate(() => Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1500))]));
    const target = options.canvas ? page.locator('canvas').first() : page;
    const bytes = await target.screenshot({ timeout: 15000 });
    const folder = `public/projects/${options.slug || name}`;
    fs.mkdirSync(folder, { recursive: true });
    const file = `${folder}/${options.file || 'showcase'}.webp`;
    await sharp(bytes).resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 88 }).toFile(file);
    fs.writeFileSync(`${evidence}/${name}.png`, bytes);
    row.file = '/' + file.replace(/^public\//, '');
    row.text = (await page.locator('body').innerText()).slice(0, 24000);
    row.controls = await page.locator('button,input,textarea,[contenteditable=true]').evaluateAll(es => es.map(e => ({tag:e.tagName,text:e.innerText.slice(0,100),label:e.getAttribute('aria-label'),id:e.id,editable:e.getAttribute('contenteditable')})));
    if(options.video) {
      row.crop = await page.locator('canvas').first().boundingBox();
      await page.waitForTimeout(3000);
    }
    row.success = true;
  } catch (e) {
    row.error = e.message;
    row.text = (await page.locator('body').innerText().catch(() => '')).slice(0, 18000);
    row.controls = await page.locator('button,input,textarea,[contenteditable=true]').evaluateAll(es=>es.map(e=>({tag:e.tagName,text:e.innerText.slice(0,100),label:e.getAttribute('aria-label'),id:e.id}))).catch(()=>[]);
    await page.screenshot({path:`${evidence}/${name}-error.png`,timeout:5000}).catch(()=>{});
  }
  const video = page.video();
  await context.close();
  if(options.video && row.success && video && row.crop) {
    const raw = await video.path();
    const c = row.crop;
    const crop = [c.width,c.height,c.x,c.y].map(v=>Math.floor(v/2)*2);
    const target = `public/projects/micro-arcade/breakout-demo.mp4`;
    execFileSync('ffmpeg',['-y','-ss',String(row.videoStart || 3),'-i',raw,'-t','2','-an','-vf',`crop=${crop.join(':')},scale=960:-2`,'-r','24','-c:v','libx264','-preset','slow','-crf','26','-pix_fmt','yuv420p','-movflags','+faststart',target],{stdio:'ignore'});
    row.video = '/projects/micro-arcade/breakout-demo.mp4';
  }
  records.push(row);
  fs.writeFileSync(`${evidence}/manifest.json`,JSON.stringify(records,null,2));
}
await record('arcade-breakout','https://thiepn.dev/arcade/',async(page,row,began)=>{
  await page.locator('#play-btn-breakout').click();
  await page.locator('canvas').first().waitFor();
  row.videoStart=(Date.now()-began)/1000;
  await page.waitForTimeout(250);
},{slug:'micro-arcade',file:'showcase-breakout',canvas:true,video:true});
await record('arcade-blockdrop','https://thiepn.dev/arcade/',async page=>{
  await page.locator('#play-btn-blockdrop').click();await page.locator('canvas').first().waitFor();
  for(const key of ['ArrowLeft','ArrowLeft','Space','ArrowRight','ArrowRight','Space','ArrowUp','Space','ArrowLeft','Space','ArrowRight','ArrowRight','Space']){await page.keyboard.press(key);await page.waitForTimeout(180)}
},{slug:'micro-arcade',file:'showcase-blockdrop',canvas:true});
await record('arcade-vanguard','https://thiepn.dev/arcade/',async page=>{
  await page.locator('#play-btn-vanguard').click();await page.locator('canvas').first().waitFor();
  await page.keyboard.down('Space');await page.keyboard.down('ArrowLeft');await page.waitForTimeout(700);await page.keyboard.up('ArrowLeft');await page.keyboard.down('ArrowRight');await page.waitForTimeout(1000);await page.keyboard.up('ArrowRight');await page.waitForTimeout(700);await page.keyboard.up('Space');
},{slug:'micro-arcade',file:'showcase-vanguard',canvas:true});
await record('tiny-tools','https://thiepn.dev/tools/#/tool/text-cleaner',async page=>{
  const input=page.locator('textarea').first();await input.waitFor();await input.fill('  A little less friction.    A little more focus.  \n\nKeep the words.    Lose the extra spaces.');await page.waitForTimeout(500);
},{slug:'tiny-tools',file:'showcase'});
await record('tiny-tools-json','https://thiepn.dev/tools/#/tool/json-formatter',async page=>{
  const input=page.locator('textarea').first();await input.waitFor();await input.fill('{"project":"Tiny Tools","processing":"local","tasks":["clean text","format data","convert files"]}');await page.waitForTimeout(500);
},{slug:'tiny-tools',file:'showcase-json'});
await record('manuscript','https://thiepn.dev/manuscript/',async page=>{
  await page.getByRole('button',{name:'Start Writing',exact:true}).click();await page.waitForTimeout(600);
  const blank=page.locator('[data-action=onboarding-blank]');if(await blank.isVisible())await blank.click();
  await page.waitForFunction(()=>document.documentElement.dataset.screen==='editor');
  const split=page.locator('[data-workspace=split]');if(await split.count())await split.click();
  await page.waitForTimeout(700);
  const editable=page.locator('.cm-content[contenteditable=true]').first();
  if(await editable.count()){
    await editable.click();await page.keyboard.press('Control+a');await page.keyboard.insertText('# A field guide to curiosity\n\nSmall experiments are a way of asking better questions. A useful tool begins with a real task, a clear constraint, and a willingness to try again.\n\n## Start with something concrete\n\nChoose one question. Make the smallest working version. Use it long enough to discover what the first sketch missed.\n\n> The interesting part is what happens between the idea and the thing you can use.\n\n## Three questions worth keeping\n\n| Question | What it reveals |\n| --- | --- |\n| Who is this for? | The person, not the feature list |\n| What can they do? | An outcome, not a promise |\n| What can go wrong? | The boundary of the design |\n\n## Keep the evidence\n\nA short record of the choices, the compromises, and the result is often more useful than a long list of features.');
  }else{const input=page.locator('textarea.markdown-editor, #markdown-editor').first();await input.fill('# A field guide to curiosity\n\nSmall experiments are a way of asking better questions.\n\n## Start with something concrete\n\nMake the smallest working version. Test it. Keep the useful parts.');}
  await page.waitForTimeout(1800);
},{slug:'manuscript',file:'showcase-editor'});
await record('pdf-studio','https://thiepn.dev/pdf/',async page=>{
  await page.getByRole('button',{name:'Open sample',exact:true}).click();await page.waitForTimeout(2300);
},{slug:'pdf-studio',file:'showcase-workspace'});
await record('wordstrike','https://thiepn.dev/wordstrike/',async page=>{
  const close=page.getByRole('button',{name:'Close tutorial'});if(await close.count())await close.click();
  await page.getByRole('button',{name:'START',exact:true}).click();await page.waitForTimeout(400);
  await page.locator('button:visible').filter({hasText:/ENDLESS/}).first().click();await page.waitForTimeout(800);
  // Capture the actual play configuration if the game intentionally requires a mode choice.
  const play=page.getByRole('button',{name:/^PLAY$|^START GAME$|^START RUN$|^BEGIN$/i}).filter({visible:true}).first();
  if(await play.count())await play.click();await page.waitForTimeout(2400);
},{slug:'wordstrike',file:'showcase-run'});
await record('the-bible-challenge','https://thiepn.dev/tbc/',async page=>{
  const beginner=page.getByRole('button',{name:/^1\s*Beginner/}).filter({visible:true}).first();
  if(await beginner.count())await beginner.click();await page.waitForTimeout(500);
  const quick=page.locator('button:visible').filter({hasText:/^Quick Play$/}).first();
  await quick.click();await page.waitForTimeout(1400);
},{slug:'the-bible-challenge',file:'showcase-question'});
await browser.close();
// Fail only for the indispensable new project media; other captures remain explicitly reported.
if(!records.find(r=>r.name==='tiny-tools'&&r.success))process.exitCode=1;
