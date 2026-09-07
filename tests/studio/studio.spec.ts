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
   if(process.env.LIBRARY_ASSET_DIR){
    const body=fs.readFileSync(process.env.LIBRARY_ASSET_DIR+path.replace('/library/media',''));
    libraryAssets.set(path,{body,contentType:path.endsWith('.svg')?'image/svg+xml':'image/webp'});
    continue;
   }
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
  for(const image of await page.locator('img:visible').all()){await image.scrollIntoViewIfNeeded();await expect(image).toHaveJSProperty('complete',true,{timeout:15000});}
  const broken=await page.locator('img:visible').evaluateAll(es=>es.filter(e=>!(e as HTMLImageElement).naturalWidth).map(e=>e.getAttribute('src')));expect(broken).toEqual([]);
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
 expect(await page.locator('[data-simple-item]').count()).toBeGreaterThan(15);await expect(page.locator('.mobile-menu__noscript')).toBeVisible();await page.goto('http://127.0.0.1:4321/');await expect(page.getByRole('link',{name:'Play Micro Arcade'}).last()).toBeVisible();
 await expect(page.locator('[data-preview-input]')).toBeDisabled();await expect(page.locator('[data-preview-output]')).toHaveValue(/A little less friction/);await expect(page.getByRole('link',{name:'Open Tiny Tools',exact:false}).first()).toBeVisible();await ctx.close();
});
for(const route of ['/','/work/','/projects/','/about/','/books/','/collections/','/collection/browser-games/','/project/micro-arcade/','/project/pdf-studio/','/project/manuscript/','/project/tiny-tools/','/privacy/'])for(const theme of ['light','dark'] as const){
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
for(const route of ['/','/project/micro-arcade/'])test(`all gameplay panels load and keyboard navigation works ${route}`,async({page})=>{
 await page.goto(route);const tabs=page.locator('[data-media-tab]');await expect(tabs).toHaveCount(3);
 for(let i=0;i<3;i++){
  await tabs.nth(i).click();await expect(tabs.nth(i)).toHaveAttribute('aria-selected','true');
  const panel=page.locator('[data-media-panel]:visible');await expect(panel).toHaveCount(1);
  await expect(panel.locator('img')).toHaveJSProperty('complete',true);
  expect(await panel.locator('img').evaluate((e:HTMLImageElement)=>e.naturalWidth)).toBeGreaterThan(0);
 }
 await tabs.nth(0).focus();await page.keyboard.press('ArrowRight');await expect(tabs.nth(1)).toBeFocused();
 await page.keyboard.press('End');await expect(tabs.nth(2)).toBeFocused();await page.keyboard.press('Home');await expect(tabs.nth(0)).toBeFocused();
});
test('recording is opt-in, recovers from failure, and never blocks the launch link',async({page})=>{
 const requests:string[]=[];page.on('request',r=>{if(r.url().includes('.mp4'))requests.push(r.url());});
 await page.route('**/*.mp4',r=>r.abort('failed'));await page.goto('/');
 const video=page.locator('[data-demo-video]');await expect(video).not.toHaveAttribute('src',/.+/);expect(requests).toEqual([]);
 await page.getByRole('button',{name:/Watch gameplay/}).click();
 await expect(page.locator('[data-media-status]')).toContainText(/could not/);expect(requests.length).toBeGreaterThan(0);
 await expect(page.getByRole('link',{name:'Play Micro Arcade'})).toHaveAttribute('href','/arcade/');await expect(video).not.toBeVisible();
});
test('Tiny Tools preview is useful, bounded and private',async({page})=>{
 await page.goto('/');const preview=page.locator('[data-text-preview]');await expect(preview).toHaveAttribute('data-ready','true');
 const input=page.locator('[data-preview-input]'),output=page.locator('[data-preview-output]');
 const requests:string[]=[];page.on('request',r=>{if(['fetch','xhr'].includes(r.resourceType()))requests.push(r.url());});
 await input.fill('  Bonjour   안녕하세요  😀  ');await expect(output).toHaveValue('Bonjour 안녕하세요 😀');
 expect(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}))).not.toContain('Bonjour');
 await page.waitForTimeout(150);expect(requests).toEqual([]);
 await input.fill('');await expect(page.locator('[data-preview-copy]')).toBeDisabled();
 await page.locator('[data-preview-reset]').click();await expect(input).toBeFocused();await expect(input).toHaveValue(/A little/);
});
test('clipboard rejection gives a selectable result instead of false success',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(new Error('Denied'))}}));
 await page.goto('/');await page.locator('[data-preview-copy]').click();await expect(page.locator('[data-preview-status]')).toContainText('copy it manually');await expect(page.locator('[data-preview-output]')).toBeFocused();
});
test('clipboard success copies exactly the cleaned result',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:(value:string)=>{(window as any).__copied=value;return Promise.resolve();}}}));
 await page.goto('/');await page.locator('[data-preview-input]').fill(' one   two ');await page.locator('[data-preview-copy]').click();
 await expect(page.locator('[data-preview-status]')).toHaveText('Cleaned text copied.');expect(await page.evaluate(()=>(window as any).__copied)).toBe('one two');
});
test('Tiny Tools feature and its task links are present on home, work and project',async({page})=>{
 await page.goto('/');await expect(page.locator('#tiny-tools')).toContainText('Small jobs.');
 await expect(page.getByRole('link',{name:'Open Tiny Tools',exact:false}).first()).toHaveAttribute('href','/tools/');
 for(const route of ['/','/project/tiny-tools/']){await page.goto(route);for(const task of ['text-cleaner','image-converter','json-formatter','qr-studio'])expect(await page.locator(`a[href="/tools/#/tool/${task}"]`).count()).toBeGreaterThan(0);}
 await page.goto('/work/');await expect(page.locator('[data-project="tiny-tools"]')).toBeVisible();
});
for(const slug of ['tiny-tools','micro-arcade','pdf-studio'])test(`build notes contain inspectable pinned source evidence ${slug}`,async({page})=>{
 await page.goto(`/project/${slug}/`);const notes=page.locator('.build-notes');await expect(notes).toBeVisible();
 for(const href of await notes.locator('a').evaluateAll(es=>es.map(e=>(e as HTMLAnchorElement).href)))expect(href).toMatch(/^https:\/\/github\.com\/thiepn\/[^/]+\/blob\/[0-9a-f]{40}\//);
});
