import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const manifest=JSON.parse(fs.readFileSync('src/generated/launch-manifest.json','utf8'));
const hub={excluded:manifest.excluded,projects:manifest.entries.map((e:{id:string})=>({slug:e.id})),expectedCount:manifest.entries.length,expectedCategoryCounts:Object.fromEntries(manifest.categories.map((c:{id:string})=>[c.id,manifest.entries.filter((e:{category:string})=>e.category===c.id).length]))};

for (const width of [320, 390, 768, 1024, 1440]) for (const theme of ['light', 'dark'] as const) {
  test(`H1 Home and app search reflow ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    for (const route of ['/home/', '/search/']) {
      await page.goto(route);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      if (route === '/home/') {
        await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
        if (width < 768) await expect(page.getByRole('navigation', { name: 'Mobile workspace navigation' })).toBeVisible();
      } else {
        await expect(page.locator('.ws-brand .ws-brand-type strong')).toHaveText('THIEPN.');
        await expect(page.locator('.ws-brand .ws-brand-type small')).toHaveText('PERSONAL INDEX');
        if (width < 768) await expect(page.getByRole('navigation', { name: 'Mobile workspace navigation' })).toBeVisible();
      }
    }
    expect(errors).toEqual([]);
  });
}

test('legacy pins migrate once, customization persists and the Apps catalogue stays separate', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('notes:sentinel','keep');localStorage.setItem('thiepn:hub-preferences',JSON.stringify({version:1,pins:['notes','canvas'],density:'comfortable'})); });
  await page.goto('/home/?mode=workspace');await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  await expect(page.locator('[data-workspace]')).toHaveAttribute('data-density','comfortable');
  await expect(page.locator('[data-launch]')).toHaveCount(2);await expect(page.locator('[data-hub-item]')).toHaveCount(0);
  await page.locator('[data-widget-type=app-shortcuts] header [data-action=configure-widget]').click();
  await page.getByLabel('Widget title').fill('My tools');await page.locator('input[name=appIds][value=tiny-tools]').check();
  await page.locator('[data-dialog-submit]').click();
  await page.reload();await expect(page.getByRole('heading',{name:'My tools',exact:true})).toBeVisible();await expect(page.locator('[data-launch]')).toHaveCount(3);
  expect(await page.evaluate(()=>localStorage.getItem('notes:sentinel'))).toBe('keep');
  expect(JSON.parse(await page.evaluate(()=>localStorage.getItem('thiepn:hub-preferences')!)).pins).toEqual(['notes','canvas']);
  await page.goto('/apps/');await expect(page.locator('[data-hub-item]')).toHaveCount(hub.expectedCount);
});
test('invalid legacy preferences recover and intentionally empty shortcuts survive reload',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('thiepn:hub-preferences','{invalid'));await page.goto('/home/?mode=workspace');
 await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
 await page.locator('[data-widget-type=app-shortcuts] header [data-action=configure-widget]').click();
 while(await page.locator('input[name=appIds]:checked').count())await page.locator('input[name=appIds]:checked').first().uncheck();
 await page.locator('[data-dialog-submit]').click();
 await page.reload();await expect(page.locator('[data-launch]')).toHaveCount(0);await expect(page.getByRole('heading',{name:'No shortcuts'})).toBeVisible();
});

test('Public task search is direct, reloadable, curated and network independent', async ({ page, request }) => {
  const payload = await (await request.get('/hub-search.json')).json();
  expect(payload.projects.map((p: any) => p.slug)).toEqual(hub.projects.map((p: any) => p.slug));
  expect(payload.collections).toEqual([]);
  await page.goto('/search/?q=merge+PDF');
  await expect(page.locator('[data-portal-query]')).toHaveValue('merge PDF');
  await expect(page.locator('[data-portal-search-slug]:visible').first()).toHaveAttribute('data-portal-search-slug', 'pdf-studio');
  await expect(page.locator('[data-portal-search-slug="pdf-studio"] a').first()).toHaveAttribute('href', 'https://thiepn.dev/pdf/');
  await page.locator('[data-portal-query]').fill('zzzz-no-app');
  await expect(page.locator('[data-portal-search-empty]')).toBeVisible();
  await page.locator('[data-portal-query]').fill('');
  await expect(page.locator('[data-portal-search-slug]:visible')).toHaveCount(hub.expectedCount);
  await page.locator('[data-portal-query]').fill('Scripture memory');
  await expect(page.locator('[data-portal-search-slug]:visible').first()).toHaveAttribute('data-portal-search-slug', 'tms60');
  await page.reload();
  await expect(page.locator('[data-portal-query]')).toHaveValue('Scripture memory');
  await expect(page.locator('[data-portal-search-slug="tms60"] a').first()).toHaveAttribute('href', 'https://tms60.thiepn.dev/');
  for (const slug of hub.excluded) await expect(page.locator(`[data-portal-search-slug="${slug}"]`)).toHaveCount(0);
});

test('Apps route, Home privacy, and no-JavaScript launchers', async ({ browser, request }) => {
  const home = await request.get('/home/'); expect(await home.text()).toContain('noindex,nofollow');
  expect(await (await request.get('/sitemap.xml')).text()).not.toContain('https://thiepn.dev/home/');
  expect(await (await request.get('/sitemap.xml')).text()).toContain('https://thiepn.dev/search/');
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4321/apps/'); await expect(page).toHaveURL('http://127.0.0.1:4321/apps/'); await expect(page.locator('[data-hub-item]')).toHaveCount(hub.expectedCount);
  await page.goto('http://127.0.0.1:4321/'); await expect(page.locator('.ws-shortcuts a')).toHaveCount(4); await expect(page.locator('[data-hub-item]')).toHaveCount(0);
  await page.goto('http://127.0.0.1:4321/search/'); await expect(page.locator('[data-portal-search-slug]')).toHaveCount(hub.expectedCount);
  await context.close();
});

for (const route of ['/home/', '/search/']) for (const theme of ['light', 'dark'] as const) {
  test(`H1 accessibility ${route} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ colorScheme: theme }); await page.goto(route);
    await page.addScriptTag({ path: process.env.AXE_PATH || '/tmp/audit-tools/node_modules/axe-core/axe.min.js' });
    const audit = async () => page.evaluate(async () => (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } }));
    expect((await audit()).violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) }))).toEqual([]);
    if (route === '/home/') {
      await page.getByRole('button', { name: 'Customize', exact: true }).click();
      expect((await audit()).violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) }))).toEqual([]);
    }
  });
}

test('H1 rendered review captures and local shell timings', async ({ page }, testInfo) => {
  const timings: unknown[] = [];
  for (const [width, theme] of [[1440, 'light'], [390, 'dark']] as const) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    for (const [route, name] of [['/home/', 'home'], ['/search/?q=French+vocabulary', 'search']] as const) {
      await page.goto(route); await page.evaluate(() => document.fonts.ready);
      const body = await page.screenshot(); await testInfo.attach(`${name}-${width}-${theme}`, {body, contentType:'image/png'});
      const dir='test-results/h1-review'; fs.mkdirSync(dir,{recursive:true}); fs.writeFileSync(`${dir}/${name}-${width}-${theme}.png`,body);
      timings.push(await page.evaluate(({ route, width, theme }) => ({route,width,theme,domContentLoadedMs:(performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming).domContentLoadedEventEnd, paints:performance.getEntriesByType('paint').map(p=>({name:p.name,timeMs:p.startTime}))}), {route,width,theme}));
    }
  }
  fs.writeFileSync('test-results/h1-review/timings.json',JSON.stringify({environment:'Local headless Chromium; no network/CPU throttling; synthetic timing, not field Web Vitals',timings},null,2));
});

for (const count of [100, 250]) {
  test(`H1 metadata-only ${count}-app rendered scale and keyboard launch`, async ({ page, request }) => {
    const payload = await (await request.get('/hub-search.json')).json();
    const fixtures = Array.from({length:count}, (_, i) => ({...payload.projects[0],slug:`fixture-${i}`,title:`Fixture app ${i}`,subtitle:'Scale fixture',summary:'',aliases:[],tags:[],liveUrl:`https://thiepn.dev/notes/?fixture=${i}`}));
    // Replace only this test's response with public fixture metadata and static launch rows.
    // The production registry, generator and runtime stay unchanged.
    await page.route('**/search/', async route => {
      const response = await route.fetch(); let html = await response.text();
      const start = html.indexOf('<div class="portal-search-results"');
      const end = html.indexOf('<p class="portal-search-empty"', start);
      expect(start).toBeGreaterThan(0); expect(end).toBeGreaterThan(start);
      const rows = fixtures.map(app => `<article class="portal-search-row" data-portal-search-slug="${app.slug}"><div><h2><a href="${app.liveUrl}">${app.title}</a></h2><p>Scale fixture</p></div><div class="portal-search-actions"><a href="${app.liveUrl}">Open app</a></div></article>`).join('');
      html = html.slice(0,start)+`<div class="portal-search-results" data-portal-search-results>${rows}</div>`+html.slice(end);
      html = html.replace(/<script[^>]*data-portal-app-index[^>]*>[\s\S]*?<\/script>/, `<script type="application/json" data-portal-app-index>${JSON.stringify(fixtures)}</script>`);
      await route.fulfill({response,body:html});
    });
    await page.setViewportSize({width:390,height:844}); await page.goto('/search/');
    await expect(page.locator('[data-portal-search-slug]:visible')).toHaveCount(count);
    const query = page.locator('[data-portal-query]'); await query.fill(`Fixture app ${count-1}`);
    const first = page.locator('[data-portal-search-slug]:visible').first();
    await expect(first).toHaveAttribute('data-portal-search-slug',`fixture-${count-1}`);
    await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
    await expect(first.locator('h2 a')).toBeFocused();
    await expect(first.locator('h2 a')).toHaveAttribute('href',`https://thiepn.dev/notes/?fixture=${count-1}`);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
}
