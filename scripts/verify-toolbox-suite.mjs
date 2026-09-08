// Optional browser verification against a running preview or the deployed portfolio.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const origin=process.env.TOOLBOX_BASE_URL||'http://127.0.0.1:4321';
const out=process.env.TOOLBOX_EVIDENCE_DIR||'toolbox-qa';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch();
const results=[];
try {
 for(const width of [320,375,768,1440])for(const theme of ['light','dark']){
  const page=await browser.newPage({viewport:{width,height:960},colorScheme:theme});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const response=await page.goto(origin+'/',{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);
  await page.evaluate(()=>document.fonts.ready);
  assert.equal(await page.locator('#tiny-tools [data-toolbox-family]').count(),8);
  assert.equal(await page.locator('#tiny-tools textarea').count(),0);
  await page.locator('#tiny-tools').screenshot({path:`${out}/toolbox-${width}-${theme}.png`});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  assert.equal(overflow,false);assert.deepEqual(errors,[]);
  results.push({kind:'layout',width,theme,overflow,errors});await page.close();
 }
 const names={
  'merge-pdf':'Merge PDFs','document-converter':'Document & eBook Converter','image-converter':'Image Converter','color-palette-generator':'Color Palette & Harmony Generator',
  'audio-converter':'Audio Converter','subtitle-converter':'Subtitle Converter','data-converter':'Data & Spreadsheet Converter','archive-converter':'Archive Converter',
  'word-counter':'Word & Character Counter','regex-tester':'Regex Tester & Debugger','statistics-calculator':'Statistics Calculator','unit-converter':'Unit Converter',
  'keyboard-test':'Keyboard Tester','browser-capability-inspector':'Browser Capability Inspector','time-zone-converter':'Time Zone & World Clock Converter','qr-studio':'QR Code Studio & Scanner'
 };
 const config=JSON.parse(fs.readFileSync('src/data/showcase.json','utf8'));
 for(const family of config.toolFamilies)for(const tool of family.tools){
  const id=tool.href.split('/').pop();assert(names[id],`Missing expected title: ${id}`);
  const page=await browser.newPage();const response=await page.goto('https://thiepn.dev'+tool.href,{waitUntil:'domcontentloaded'});
  assert.equal(response.status(),200);await page.waitForFunction(name=>document.title===name+' — Tiny Tools',names[id],{timeout:15000});
  results.push({kind:'live-tool-route',id,status:response.status(),title:await page.title(),url:page.url()});await page.close();
 }
} finally {await browser.close();fs.writeFileSync(`${out}/results.json`,JSON.stringify({origin,checkedAt:new Date().toISOString(),results},null,2));}
console.log('Suite layout and all 16 live tool destinations passed.');
