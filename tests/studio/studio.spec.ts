import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const routes: { routes: string[] } = JSON.parse(fs.readFileSync('src/generated/route-manifest.json', 'utf8'));
const showcase: { hero: string; work: string[]; projects: Record<string, { media: string }> } = JSON.parse(fs.readFileSync('src/data/showcase.json', 'utf8'));
const hub: {
  expectedCount: number;
  excluded: string[];
  projects: { slug: string; order: number; category: string; description: string; badge: string | null }[];
} = JSON.parse(fs.readFileSync('src/data/hub.json', 'utf8'));

const orderedHub = [...hub.projects].sort((a, b) => a.order - b.order);
const categories = {
  tools: 4,
  create: 4,
  learn: 6,
  faith: 3,
  explore: 2,
  games: 7,
} as const;

for (const width of [320, 375, 768, 1440, 1920]) for (const theme of ['light', 'dark'] as const) {
  test(`Hub hierarchy and layout ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/');

    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toContainText("Things I've built.");
    await expect(page.locator('[data-hub-item]')).toHaveCount(26);
    await expect(page.locator('[data-hub-search]')).toBeVisible();
    await expect(page.locator('[data-hub-category]')).toHaveCount(7);
    await expect(page.locator('[data-project="micro-arcade"]')).toHaveCount(0);
    await expect(page.locator('#tiny-tools')).toHaveCount(0);

    const firstCard = page.locator('[data-hub-item]').first();
    await expect(firstCard).toBeVisible();
    const firstRect = await firstCard.boundingBox();
    expect(firstRect).not.toBeNull();
    expect(firstRect!.y).toBeLessThan(900);

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    if (width > 760) await expect(page.locator('.site-nav')).toBeVisible();
    else await expect(page.locator('.site-nav')).not.toBeVisible();
  });
}

test('Hub renders the locked app membership, order, direct launch and details links', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('[data-hub-item]');
  await expect(cards).toHaveCount(hub.expectedCount);

  const titles = await cards.locator('h2').allTextContents();
  expect(titles.length).toBe(26);
  expect(titles[0]).toBe('Signal Earth');
  expect(titles[1]).toBe('Notes');
  expect(titles[2]).toBe('Canvas');
  expect(titles.at(-1)).toBe('Skyspire');

  for (const entry of orderedHub) {
    const card = cards.nth(entry.order - 1);
    await expect(card).toHaveAttribute('data-hub-category', entry.category);
    await expect(card.getByRole('link', { name: 'Open app', exact: false })).toBeVisible();
    await expect(card.getByRole('link', { name: 'Details', exact: true })).toHaveAttribute('href', `/project/${entry.slug}/`);
  }

  for (const slug of hub.excluded) {
    await expect(page.locator(`[data-hub-item] a[href="/project/${slug}/"]`)).toHaveCount(0);
  }
});

test('Hub search, category filters, empty state and URL state work', async ({ page }) => {
  await page.goto('/');
  const visibleCards = page.locator('[data-hub-item]:visible');
  const search = page.locator('[data-hub-search]');

  await expect(visibleCards).toHaveCount(26);
  await page.locator('[data-hub-category="games"]').click();
  await expect(visibleCards).toHaveCount(categories.games);
  await expect(page).toHaveURL(/category=games/);
  await expect(page.locator('[data-hub-category="games"]')).toHaveAttribute('aria-pressed', 'true');

  await search.fill('gomoku');
  await expect(visibleCards).toHaveCount(1);
  await expect(visibleCards.first()).toContainText('Gomoku');
  await expect(page).toHaveURL(/q=gomoku/);

  await search.fill('zzzz-no-such-app');
  await expect(visibleCards).toHaveCount(0);
  await expect(page.locator('[data-hub-empty]')).toBeVisible();

  await page.locator('[data-hub-reset]').click();
  await expect(visibleCards).toHaveCount(26);
  await expect(search).toBeFocused();
  await expect(page.locator('[data-hub-category="all"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page).not.toHaveURL(/category=/);
  await expect(page).not.toHaveURL(/[?&]q=/);

  await page.goto('/?category=faith');
  await expect(visibleCards).toHaveCount(categories.faith);
  await expect(page.locator('[data-hub-category="faith"]')).toHaveAttribute('aria-pressed', 'true');

  await page.goto('/?q=signal');
  await expect(search).toHaveValue('signal');
  await expect(visibleCards).toHaveCount(1);
  await expect(visibleCards.first()).toContainText('Signal Earth');
});

for (const route of routes.routes.filter((route) => !route.endsWith('.json'))) {
  test(`public route content and metadata ${route}`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator('main#main-content')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://thiepn.dev${route}`);
    const title = await page.title();
    expect(title).toContain('THIEPN');
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toBeTruthy();
    for (const text of await page.locator('script[type="application/ld+json"]').allTextContents()) expect(() => JSON.parse(text)).not.toThrow();
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 700) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
    });
    for (const image of await page.locator('img:visible').all()) {
      await image.scrollIntoViewIfNeeded();
      await expect(image).toHaveJSProperty('complete', true, { timeout: 15000 });
    }
    const broken = await page.locator('img:visible').evaluateAll((elements) => elements.filter((element) => !(element as HTMLImageElement).naturalWidth).map((element) => element.getAttribute('src')));
    expect(broken).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });
}

test('archive search, empty state, filters and browser Back', async ({ page }) => {
  await page.goto('/projects/');
  const rows = page.locator('[data-simple-item]:visible');
  const total = await rows.count();
  expect(total).toBeGreaterThan(20);
  await page.locator('[data-archive-query]').fill('zzzz-no-such-project');
  await expect(rows).toHaveCount(0);
  await expect(page.locator('[data-simple-empty]')).toBeVisible();
  await page.locator('[data-simple-reset]').click();
  await expect(rows).toHaveCount(total);
  await expect(page.locator('[data-archive-query]')).toBeFocused();
  await page.locator('[data-archive-type]').selectOption('games');
  await expect(page).toHaveURL(/category=games/);
  expect(await rows.count()).toBeLessThan(total);
  await page.locator('[data-archive-query]').fill('micro');
  await expect(rows).toHaveCount(1);
  await expect(page).toHaveURL(/q=micro/);
  await page.goBack();
  await expect(page.locator('[data-archive-query]')).toHaveValue('');
  await expect(page.locator('[data-archive-type]')).toHaveValue('games');
});

test('global search supports keyboard, no results, Escape and focus restoration', async ({ page }) => {
  await page.goto('/');
  await page.locator('.site-header__search').focus();
  await page.keyboard.press('Control+k');
  const input = page.locator('[data-catalogue-search-input]');
  await expect(input).toBeFocused();
  await input.fill('pdf');
  await expect(page.locator('[data-search-result]').first()).toContainText('PDF Studio');
  await page.keyboard.press('ArrowDown');
  await expect(input).toHaveAttribute('aria-activedescendant', /catalogue-result/);
  await input.fill('zzzz-no-such-project');
  await expect(page.locator('[data-search-result]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-catalogue-search-dialog]')).not.toBeVisible();
  await expect(page.locator('.site-header__search')).toBeFocused();
});

test('global search retries after an index network failure', async ({ page }) => {
  let attempts = 0;
  await page.route('**/search-index.json', async (route) => {
    if (++attempts === 1) await route.fulfill({ status: 503, body: 'Unavailable' });
    else await route.continue();
  });
  await page.goto('/');
  await page.keyboard.press('Control+k');
  await expect(page.locator('[data-catalogue-search-status]')).toContainText(/could not|unavailable|couldn.t|unable/i);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+k');
  await expect(page.locator('[data-search-result]').first()).toBeVisible();
  expect(attempts).toBe(2);
});

test('mobile menu, search handoff and persistent theme', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  await menu.click();
  const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation', exact: true });
  await expect(mobileNav).toBeVisible();
  await expect(mobileNav.getByRole('link', { name: 'Apps', exact: true })).toBeVisible();
  await expect(mobileNav.getByRole('link', { name: 'Project archive', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await menu.click();
  await page.locator('.mobile-menu__search').click();
  await expect(page.locator('[data-catalogue-search-input]')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await page.locator('.site-footer [data-theme-option="dark"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('app Hub and archive survive JavaScript disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4321/projects/');
  expect(await page.locator('[data-simple-item]').count()).toBeGreaterThan(20);
  await expect(page.locator('.mobile-menu__noscript')).toBeVisible();

  await page.goto('http://127.0.0.1:4321/');
  await expect(page.locator('[data-hub-item]')).toHaveCount(26);
  await expect(page.getByRole('heading', { name: 'Tiny Tools', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Micro Arcade', exact: true })).toBeVisible();
  await expect(page.locator('#tiny-tools')).toHaveCount(0);
  await expect(page.locator('[data-project="micro-arcade"]')).toHaveCount(0);
  await context.close();
});

for (const route of ['/', '/work/', '/projects/', '/about/', '/books/', '/collections/', '/collection/browser-games/', '/project/micro-arcade/', '/project/pdf-studio/', '/project/manuscript/', '/project/tiny-tools/', '/privacy/']) for (const theme of ['light', 'dark'] as const) {
  test(`accessibility ${route} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await page.goto(route);
    await page.addScriptTag({ path: process.env.AXE_PATH || '/tmp/audit-tools/node_modules/axe-core/axe.min.js' });
    const result = await page.evaluate(async () => await (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } }));
    expect(result.violations.map((violation: any) => ({ id: violation.id, nodes: violation.nodes.map((node: any) => node.target) }))).toEqual([]);
    await page.addStyleTag({ content: '*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  });
}

test('portfolio publication sources remain explicit, not invented', () => {
  expect(showcase.hero).toBe('micro-arcade');
  for (const slug of showcase.work) {
    const data = showcase.projects[slug];
    expect(fs.existsSync(`public${data.media}`)).toBe(true);
  }
});

test('Micro Arcade project detail keeps its canonical gameplay media deck', async ({ page }) => {
  await page.goto('/project/micro-arcade/');
  const tabs = page.locator('[data-media-tab]');
  await expect(tabs).toHaveCount(3);
  for (let index = 0; index < 3; index += 1) {
    await tabs.nth(index).click();
    await expect(tabs.nth(index)).toHaveAttribute('aria-selected', 'true');
    const panel = page.locator('[data-media-panel]:visible');
    await expect(panel).toHaveCount(1);
    await expect(panel.locator('img')).toHaveJSProperty('complete', true);
    expect(await panel.locator('img').evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
  }
  await tabs.nth(0).focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(1)).toBeFocused();
  await page.keyboard.press('End');
  await expect(tabs.nth(2)).toBeFocused();
  await page.keyboard.press('Home');
  await expect(tabs.nth(0)).toBeFocused();
});

test('Micro Arcade recording is opt-in and never blocks the project launch link', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => { if (request.url().includes('.mp4')) requests.push(request.url()); });
  await page.route('**/*.mp4', (route) => route.abort('failed'));
  await page.goto('/project/micro-arcade/');
  const video = page.locator('[data-demo-video]');
  await expect(video).not.toHaveAttribute('src', /.+/);
  expect(requests).toEqual([]);
  await page.getByRole('button', { name: /Watch gameplay/ }).click();
  await expect(page.locator('[data-media-status]')).toContainText(/could not/);
  expect(requests.length).toBeGreaterThan(0);
  await expect(page.getByRole('link', { name: /Play Micro Arcade/ }).first()).toHaveAttribute('href', '/arcade/');
  await expect(video).not.toBeVisible();
});

test('Tiny Tools is one Hub card while its project page retains the suite overview', async ({ page }) => {
  await page.goto('/');
  const card = page.getByRole('heading', { name: 'Tiny Tools', exact: true }).locator('..').locator('..');
  await expect(page.getByRole('heading', { name: 'Tiny Tools', exact: true })).toHaveCount(1);
  await expect(page.locator('#tiny-tools')).toHaveCount(0);
  await expect(page.locator('[data-toolbox-family]')).toHaveCount(0);
  await expect(card).toContainText('Hundreds of browser utilities');

  await page.goto('/project/tiny-tools/');
  await expect(page.locator('[data-toolbox-family]')).toHaveCount(8);
  await expect(page.getByRole('link', { name: 'Explore all tools', exact: false }).first()).toHaveAttribute('href', '/tools/');
  for (const task of ['merge-pdf', 'image-converter', 'audio-converter', 'data-converter', 'regex-tester', 'statistics-calculator', 'keyboard-test', 'qr-studio']) {
    expect(await page.locator(`a[href="/tools/#/tool/${task}"]`).count()).toBeGreaterThan(0);
  }

  await page.goto('/work/');
  await expect(page.locator('[data-project="tiny-tools"]')).toContainText('Hundreds of browser tools');
});

for (const slug of ['tiny-tools', 'micro-arcade', 'pdf-studio']) test(`build notes contain inspectable pinned source evidence ${slug}`, async ({ page }) => {
  await page.goto(`/project/${slug}/`);
  const notes = page.locator('.build-notes');
  await expect(notes).toBeVisible();
  for (const href of await notes.locator('a').evaluateAll((elements) => elements.map((element) => (element as HTMLAnchorElement).href))) {
    expect(href).toMatch(/^https:\/\/github\.com\/thiepn\/[^/]+\/blob\/[0-9a-f]{40}\//);
  }
});

test('Micro Arcade recording plays only on request and stops when changing project-detail panels', async ({ page }) => {
  await page.goto('/project/micro-arcade/');
  await expect(page.locator('[data-media-deck]')).toHaveAttribute('data-ready', 'true');
  const video = page.locator('[data-demo-video]');
  await expect(video).toHaveJSProperty('paused', true);
  await video.evaluate((element: HTMLVideoElement) => element.addEventListener('playing', () => { element.dataset.didPlay = 'true'; }));
  await page.getByRole('button', { name: /Watch gameplay/ }).click();
  await expect(video).toHaveAttribute('data-did-play', 'true', { timeout: 10000 });
  await page.getByRole('tab', { name: 'Block Drop', exact: true }).click();
  await expect(video).toHaveJSProperty('paused', true);
  await expect(video).not.toBeVisible();
});
