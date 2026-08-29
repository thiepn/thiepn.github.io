import { test, expect } from '@playwright/test';

// This suite certifies the canonical media-bearing state after generated catalogue refresh.
const featured = [
  'the-bible-challenge','pdf-studio','wordstrike','micro-arcade','voidcut',
];
const capturedFeatured = {
  'the-bible-challenge': '/projects/the-bible-challenge/screenshot-desktop.png',
  'pdf-studio': '/projects/pdf-studio/screenshot-desktop.png',
  'micro-arcade': '/projects/micro-arcade/screenshot-desktop.png',
  'voidcut': '/projects/voidcut/screenshot-desktop.png',
} as const;

test('homepage renders the intentional five-project featured set in order', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('#featured article');
  await expect(cards).toHaveCount(5);
  for (let index = 0; index < featured.length; index += 1) {
    await expect(cards.nth(index).locator(`[data-preview-slug="${featured[index]}"]`)).toBeVisible();
  }
});

test('static Featured projects use explicit authentic captured posters', async ({ page }) => {
  await page.goto('/');
  for (const [slug, source] of Object.entries(capturedFeatured)) {
    const root = page.locator(`#featured [data-preview-slug="${slug}"]`).first();
    await expect(root).toBeVisible();
    await expect(root).toHaveAttribute('data-preview-kind', 'static');
    await expect(root).toHaveAttribute('data-preview-provenance', 'captured');
    await expect(root).toHaveAttribute('data-preview-state', 'static');
    await expect(root.locator('img')).toHaveAttribute('src', source);
    await expect(root.locator('.scene--generic')).toHaveCount(0);
  }
});

test('Featured project records expose real secondary interface views', async ({ page }) => {
  const records = [
    ['/project/pdf-studio/', '/projects/pdf-studio/screenshot-desktop.png', '/projects/pdf-studio/screenshot-workspace.png'],
    ['/project/micro-arcade/', '/projects/micro-arcade/screenshot-desktop.png', '/projects/micro-arcade/screenshot-gameplay.png'],
    ['/project/voidcut/', '/projects/voidcut/screenshot-desktop.png', '/projects/voidcut/screenshot-gameplay.png'],
  ] as const;

  for (const [route, poster, secondary] of records) {
    await page.goto(route);
    const preview = page.locator('[data-record-preview] [data-preview-slug]').first();
    await expect(preview.locator('img')).toHaveAttribute('src', poster);
    await expect(page.locator(`img[src="${secondary}"]`).first()).toBeVisible();
  }
});

test('Manuscript project detail keeps its source-to-publication choreography for inspection', async ({ page }) => {
  await page.goto('/project/manuscript/');
  const root = page.locator('[data-record-preview] [data-preview-slug="manuscript"]').first();
  await root.hover();
  await page.waitForTimeout(240);
  await expect(root).toHaveAttribute('data-preview-state','active');
  const line = root.locator('.md-line--2');
  const animation = await line.evaluate((node) => getComputedStyle(node).animationName);
  expect(animation).toContain('p7-md-line');
});

test('WORDSTRIKE Featured video is deferred and retains its real poster', async ({ page }) => {
  await page.goto('/');
  const root = page.locator('[data-preview-slug="wordstrike"]').first();
  const status = root.locator('[data-preview-status]');
  await expect(root).toHaveAttribute('data-preview-kind', 'video');
  await expect(root).toHaveAttribute('data-preview-provenance','reconstructed');
  await expect(root.locator('.preview-shell__poster')).toHaveAttribute('src', '/projects/wordstrike/screenshot-desktop.png');
  const video = root.locator('[data-preview-video]');
  await expect(video).not.toHaveAttribute('src', /.+/);
  await root.evaluate((element) => {
    element.ownerDocument.documentElement.style.scrollBehavior = 'auto';
    element.scrollIntoView({ block: 'center', inline: 'nearest' });
  });
  await expect.poll(async () => root.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return Math.min(rect.top, window.innerHeight - rect.bottom);
  }), { timeout: 2000 }).toBeGreaterThan(200);
  await root.hover();
  await expect(video).toHaveAttribute('src', /projects\/wordstrike\/preview\.webm/);
  await expect.poll(async () => {
    const [state, label] = await Promise.all([
      root.getAttribute('data-preview-state'),
      status.textContent(),
    ]);
    return `${state}|${label}`;
  }, { timeout: 2500 }).toBe('active|DEMO');
});

test('reduced motion keeps animated previews in poster state', async ({ browser }) => {
  const context=await browser.newContext({ reducedMotion:'reduce', viewport:{width:1440,height:900} });
  const page=await context.newPage();

  await page.goto('http://127.0.0.1:4321/');
  const strike=page.locator('[data-preview-slug="wordstrike"]').first();
  await strike.hover();
  await page.waitForTimeout(320);
  await expect(strike).toHaveAttribute('data-preview-state','poster');

  await page.goto('http://127.0.0.1:4321/project/manuscript/');
  const manuscript=page.locator('[data-record-preview] [data-preview-slug="manuscript"]').first();
  await manuscript.hover();
  await page.waitForTimeout(320);
  await expect(manuscript).toHaveAttribute('data-preview-state','poster');
  await context.close();
});
