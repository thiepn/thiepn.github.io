import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const routes: {routes:string[]} = JSON.parse(fs.readFileSync('src/generated/route-manifest.json','utf8'));
const config: {hero:string;work:string[];projects:Record<string,{media:string}>} = JSON.parse(fs.readFileSync('src/data/showcase.json','utf8'));
// Fetch the separately deployed Library's real public covers once per worker.
// Preview serves those exact bytes; no invented or mocked product UI.
const libraryAssets = new Map<string, {body: Buffer; contentType: string}>();
test.beforeAll(async({playwright})=>{
 const request=await playwright.request.newContext();
 try {
  for(const path of ['/library/media/works/choosing-a-mission-organization/cover.svg','/library/media/works/how-to-love-god/editions/1.1.0/how-to-love-god.webp']){
   const response=await request.get('https://thiepn.dev'+path,{timeout:30000});
   expect(response.status()).toBe(200);
   libraryAssets.set(path,{body:await response.body(),contentType:response.headers()['content-type']||'application/octet-stream'});
  }
 } finally {await request.dispose();}
});
test.beforeEach(async({page})=>{
 await page.route('**/library/media/**',async route=>{
  const asset=libraryAssets.get(new URL(route.request().url()).pathname);
  if(!asset)throw new Error('Unexpected Library media URL');
  await route.fulfill({status:200,...asset});
 });
});
test.afterEach(async({page})=>{await page.unrouteAll({behavior:'wait'});});
for(const width of [320,375,768,1440,1920])for(const theme of ['light','dark'] as const){
 test(`home hierarchy and layout ${width} ${theme}`,async({page})=>{
  await page.setViewportSize({width,height:900});await page.emulateMedia({colorScheme:theme});await page.goto('/');
  await expect(page.locator('h1')).toHaveCount(1);await expect(page.locator('[data-project="micro-arcade"]')).toBeVisible();
  const cta=page.getByRole('link',{name:'Play Micro Arcade'}).last();await expect(cta).toBeVisible();
  const rect=await cta.boundingBox();expect(rect!.y+rect!.height).toBeLessThan(width<400?800:900);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
  await expect(page.locator('.site-nav')).toBeVisible({visible:width>760});
 });
}
for(const route of routes.routes.filter(x=>!x.endsWith('.json'))){
 test(`public route content and metadata ${route}`,async({page})=>{
  const response=await page.goto(route);expect(response?.status()).toBe(200);
  await expect(page.locator('main#main-content')).toHaveCount(1);await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href','https://thiepn.dev'+route);
  const title=await page.title();expect(title).toContain('THIEPN');
  expect(await page.locator('meta[name="description"]').getAttribute('content')).toBeTruthy();
  for(const text of await page.locator('script[type="application/ld+json"]').allTextContents())expect(()=>JSON.parse(text)).not.toThrow();
  await page.evaluate(async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=700){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,40));}});
  for(const image of await page.locator('img').all()){await image.scrollIntoViewIfNeeded();await expect(image).toHaveJSProperty('complete',true,{timeout:15000});}
  const broken=await page.locator('img').evaluateAll(es=>es.filter(e=>!(e as HTMLImageElement).naturalWidth).map(e=>e.getAttribute('src')));expect(broken).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 });
}
test('archive search, empty state, filters and browser Back',async({page})=>{
 await page.goto('/projects/');const rows=page.locator('[data-simple-item]:visible');const total=await rows.count();expect(total).toBeGreaterThan(15);
 await page.locator('[data-archive-query]').fill('zzzz-no-such-project');await expect(rows).toHaveCount(0);await expect(page.locator('[data-simple-empty]')).toBeVisible();
 await page.locator('[data-simple-reset]').click();await expect(rows).toHaveCount(total);await expect(page.locator('[data-archive-query]')).toBeFocused();
 await page.locator('[data-archive-type]').selectOption('games');await expect(page).toHaveURL(/category=games/);expect(await rows.count()).toBeLessThan(total);
 await page.locator('[data-archive-query]').fill('micro');await expect(rows).toHaveCount(1);await expect(page).toHaveURL(/q=micro/);
 await page.goBack();await expect(page.locator('[data-archive-query]')).toHaveValue('');await expect(page.locator('[data-archive-type]')).toHaveValue('games');
 await page.goto('/projects/?intent=learn');await expect(page.locator('[data-archive-type]')).toHaveValue('learning');
});
test('search supports keyboard, no results, Escape and focus restoration',async({page})=>{
 await page.goto('/');await page.locator('.site-header__search').focus();await page.keyboard.press('Control+k');
 const input=page.locator('[data-catalogue-search-input]');await expect(input).toBeFocused();await input.fill('pdf');await expect(page.locator('[data-search-result]').first()).toContainText('PDF Studio');
 await page.keyboard.press('ArrowDown');await expect(input).toHaveAttribute('aria-activedescendant',/catalogue-result/);
 await input.fill('zzzz-no-such-project');await expect(page.locator('[data-search-result]')).toHaveCount(0);
 await page.keyboard.press('Escape');await expect(page.locator('[data-catalogue-search-dialog]')).not.toBeVisible();await expect(page.locator('.site-header__search')).toBeFocused();
});
test('search retries after an index network failure',async({page})=>{
 let attempts=0;await page.route('**/search-index.json',async route=>{if(++attempts===1)await route.fulfill({status:503,body:'Unavailable'});else await route.continue();});
 await page.goto('/');await page.keyboard.press('Control+k');await expect(page.locator('[data-catalogue-search-status]')).toContainText(/could not|unavailable|couldn.t|unable/i);
 await page.keyboard.press('Escape');await page.keyboard.press('Control+k');await expect(page.locator('[data-search-result]').first()).toBeVisible();expect(attempts).toBe(2);
});
test('mobile menu, search handoff and persistent theme',async({page})=>{
 await page.setViewportSize({width:375,height:812});await page.goto('/');const menu=page.getByRole('button',{name:'Menu',exact:true});await menu.click();
 await expect(page.getByRole('navigation',{name:'Mobile navigation',exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(menu).toBeFocused();
 await menu.click();await page.locator('.mobile-menu__search').click();await expect(page.locator('[data-catalogue-search-input]')).toBeFocused();await page.keyboard.press('Escape');await expect(menu).toBeFocused();
 await page.locator('.site-footer [data-theme-option="dark"]').click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
});
test('static archive and primary work survive JavaScript disabled',async({browser})=>{
 const ctx=await browser.newContext({javaScriptEnabled:false,viewport:{width:375,height:812}});const page=await ctx.newPage();await page.goto('http://127.0.0.1:4321/projects/');
 expect(await page.locator('[data-simple-item]').count()).toBeGreaterThan(15);await expect(page.locator('.mobile-menu__noscript')).toBeVisible();await page.goto('http://127.0.0.1:4321/');await expect(page.getByRole('link',{name:'Play Micro Arcade'}).last()).toBeVisible();await ctx.close();
});
for(const route of ['/','/work/','/projects/','/about/','/books/','/collections/','/collection/browser-games/','/project/micro-arcade/','/project/pdf-studio/','/project/manuscript/','/privacy/'])for(const theme of ['light','dark'] as const){
 test(`accessibility ${route} ${theme}`,async({page})=>{
 await page.setViewportSize({width:375,height:812});await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});await page.goto(route);
 await page.addScriptTag({path:process.env.AXE_PATH||'/tmp/audit-tools/node_modules/axe-core/axe.min.js'});
 const result=await page.evaluate(async()=>await (window as any).axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}));
 expect(result.violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)}))).toEqual([]);
 await page.addStyleTag({content:'*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
 });
}
test('media and publication sources are explicit, not invented',()=>{
 expect(config.hero).toBe('micro-arcade');for(const slug of config.work){const data=(config.projects as any)[slug];expect(fs.existsSync('public'+data.media)).toBe(true);}
});