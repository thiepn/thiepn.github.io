import { chromium } from '@playwright/test';
import fs from 'node:fs';
const origin = process.env.SHOWCASE_BASE_URL || 'http://127.0.0.1:4321';
const out = process.env.SHOWCASE_EVIDENCE_DIR || 'showcase-qa';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const results = [];
const assets = new Map();
const request = await browser.newContext();
if (origin.includes('127.0.0.1')) {
  for (const url of ['/library/media/works/choosing-a-mission-organization/cover.svg', '/library/media/works/how-to-love-god/editions/1.1.0/how-to-love-god.webp']) {
    const response = await request.request.get('https://thiepn.dev' + url);
    if (response.status() !== 200) throw new Error('Real Library cover unavailable: ' + url);
    assets.set(url, { body: await response.body(), contentType: response.headers()['content-type'] });
  }
}
await request.close();
async function open(width, theme) {
  const context = await browser.newContext({ viewport: { width, height: 960 }, colorScheme: theme });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  if (assets.size) await page.route('**/library/media/**', async route => {
    const asset = assets.get(new URL(route.request().url()).pathname);
    if (!asset) throw new Error('Unrecorded Library asset');
    await route.fulfill({ status: 200, ...asset });
  });
  return { context, page };
}
async function capture(route, width, theme) {
  const { context, page } = await open(width, theme);
  const name = (route.replaceAll('/', '-') || 'home') + width + '-' + theme;
  const row = { route, width, theme, errors: [] };
  page.on('pageerror', e => row.errors.push(e.message));
  try {
    const response = await page.goto(origin + route, { waitUntil: 'networkidle' });
    row.status = response.status();
    await page.evaluate(() => document.fonts.ready);
    row.initial = await page.evaluate(() => ({
      title: document.title, width: document.documentElement.scrollWidth,
      headings: [...document.querySelectorAll('h1,h2')].map(e => ({ text: e.textContent, y: e.getBoundingClientRect().y })),
      resources: performance.getEntriesByType('resource').map(r => ({ name: r.name, bytes: r.transferSize, duration: r.duration }))
    }));
    const cta = page.getByRole('link', { name: 'Play Micro Arcade', exact: true }).first();
    if (await cta.count()) row.playAction = await cta.boundingBox();
    await page.screenshot({ path: `${out}/${name}.png` });
    await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } });
    for (const image of await page.locator('img:visible').all()) {
      await image.scrollIntoViewIfNeeded();
      await image.evaluate(e => e.decode().catch(() => {}));
    }
    row.brokenImages = await page.locator('img:visible').evaluateAll(es => es.filter(e => !e.naturalWidth).map(e => e.currentSrc));
    row.overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: `${out}/${name}-full.png`, fullPage: true });
    await page.addScriptTag({ path: process.env.AXE_PATH || '/tmp/audit-tools/node_modules/axe-core/axe.min.js' });
    row.violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa','wcag22aa'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })));
  } catch (e) { row.error = e.message; }
  results.push(row);
  await context.close();
  fs.writeFileSync(`${out}/visual-results.json`, JSON.stringify(results, null, 2));
}
for (const width of [320,375,768,1440,1920]) for (const theme of ['light','dark']) await capture('/', width, theme);
for (const route of ['/work/','/about/','/project/tiny-tools/','/project/micro-arcade/','/project/pdf-studio/','/project/manuscript/']) for (const width of [375,1440]) for (const theme of ['light','dark']) await capture(route, width, theme);
const { context, page } = await open(1440, 'light');
await page.goto(origin + '/');
await page.locator('[data-media-deck][data-ready=true]').waitFor();
for (const title of ['Block Drop','Vanguard','Breakout Mini']) {
  await page.getByRole('tab', { name: title, exact: true }).click();
  await page.locator('[data-media-panel]:visible img').evaluate(e => e.decode());
  await page.locator('.arcade-showcase').screenshot({ path: `${out}/arcade-${title.replaceAll(' ','-')}.png` });
}
await page.locator('[data-preview-input]').fill('  Less   friction.   More   focus.  ');
await page.locator('#tiny-tools').screenshot({ path: `${out}/tiny-tools-live-preview.png` });
await page.locator('[data-preview-reset]').click();
await page.locator('#tiny-tools').screenshot({ path: `${out}/tiny-tools-feature.png` });
await page.keyboard.press('Control+k');
await page.locator('[data-catalogue-search-input]').fill('tiny tools');
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/search-tiny-tools.png` });
await page.keyboard.press('Escape');
await page.setViewportSize({width:375,height:812});
await page.evaluate(() => scrollTo(0,0));
await page.getByRole('button', { name:'Menu', exact:true }).click();
await page.screenshot({path:`${out}/mobile-menu.png`});
await context.close();
await browser.close();
if(results.some(r => r.error || r.status!==200 || r.overflow || r.errors.length || r.brokenImages?.length || r.violations?.length))process.exitCode=1;
