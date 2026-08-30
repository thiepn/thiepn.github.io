import fs from 'node:fs/promises';
import path from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';

const routes = [
  '/',
  '/projects/',
  '/books/',
  '/collections/',
  '/project/pdf-studio/',
  '/project/micro-arcade/',
  '/collection/browser-games/',
];

const viewports = [
  { name: 'compact', width: 320, height: 740 },
  { name: 'small-phone', width: 360, height: 800 },
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet-portrait', width: 768, height: 1024 },
  { name: 'tablet-landscape', width: 1024, height: 768 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'wide-desktop', width: 1920, height: 1080 },
] as const;

const visualEvidenceDir = path.join(process.cwd(), 'test-results', 'final-visual-qa');

async function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

async function gridTrackCount(locator: Locator) {
  return locator.evaluate((element) => {
    const value = getComputedStyle(element).gridTemplateColumns.trim();
    if (!value || value === 'none') return 0;
    return value.split(/\s+/).length;
  });
}

async function geometry(locator: Locator) {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
}

async function saveViewportEvidence(page: Page, name: string) {
  await fs.mkdir(visualEvidenceDir, { recursive: true });
  await page.screenshot({
    path: path.join(visualEvidenceDir, `${name}.jpg`),
    type: 'jpeg',
    quality: 78,
    fullPage: false,
    animations: 'disabled',
  });
}

async function saveElementEvidence(locator: Locator, name: string) {
  await fs.mkdir(visualEvidenceDir, { recursive: true });
  await locator.scrollIntoViewIfNeeded();
  await locator.screenshot({
    path: path.join(visualEvidenceDir, `${name}.jpg`),
    type: 'jpeg',
    quality: 78,
    animations: 'disabled',
  });
}

test('final responsive matrix keeps all primary surfaces inside the viewport', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Full seven-viewport geometry matrix is certified once in Chromium.');

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const route of routes) {
      await page.goto(route);
      await expect(page.getByRole('main')).toBeVisible();
      await expect(page.locator('h1')).toBeVisible();
      expect(await horizontalOverflow(page), `${viewport.name} ${route}`).toBeLessThanOrEqual(1);

      const main = await geometry(page.getByRole('main'));
      expect(main.width, `${viewport.name} ${route} main width`).toBeLessThanOrEqual(viewport.width + 1);
      expect(main.x, `${viewport.name} ${route} main x`).toBeGreaterThanOrEqual(-1);
    }
  }
});

test('homepage and project directory switch columns at the intended visual breakpoints', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Breakpoint composition is browser-independent and measured once.');

  const cases = [
    { width: 320, supporting: 1, universe: 1, archive: 1 },
    { width: 768, supporting: 2, universe: 1, archive: 2 },
    { width: 1024, supporting: 4, universe: 1, archive: 2 },
    { width: 1440, supporting: 2, universe: 2, archive: 3 },
  ] as const;

  for (const item of cases) {
    await page.setViewportSize({ width: item.width, height: 900 });
    await page.goto('/');
    expect(await gridTrackCount(page.locator('.supporting-grid')), `${item.width}px supporting grid`).toBe(item.supporting);
    expect(await gridTrackCount(page.locator('.universe-grid')), `${item.width}px universe grid`).toBe(item.universe);

    await page.goto('/projects/');
    expect(await gridTrackCount(page.locator('[data-archive-grid]')), `${item.width}px archive grid`).toBe(item.archive);
  }
});

test('authentic captured previews preserve their 16:10 geometry without distortion', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Capture geometry is measured once in Chromium.');

  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
    await page.goto('/');

    for (const slug of ['pdf-studio', 'micro-arcade', 'voidcut']) {
      const root = page.locator(`#featured [data-preview-slug="${slug}"]`).first();
      await expect(root).toHaveAttribute('data-preview-provenance', 'captured');
      const image = root.locator('img');
      await expect(image).toBeVisible();
      const metrics = await image.evaluate((node) => {
        const img = node as HTMLImageElement;
        const rect = img.getBoundingClientRect();
        const css = getComputedStyle(img);
        return {
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          renderedRatio: rect.width / rect.height,
          naturalRatio: img.naturalWidth / img.naturalHeight,
          objectFit: css.objectFit,
        };
      });
      expect(metrics.naturalWidth, `${slug} natural width`).toBeGreaterThan(0);
      expect(metrics.naturalHeight, `${slug} natural height`).toBeGreaterThan(0);
      expect(Math.abs(metrics.naturalRatio - 1.6), `${slug} source ratio`).toBeLessThan(0.035);
      expect(Math.abs(metrics.renderedRatio - 1.6), `${slug} rendered ratio @ ${width}`).toBeLessThan(0.035);
      expect(metrics.objectFit).toBe('cover');
    }
  }
});

test('collection relationship inspector uses authentic project media and reflows cleanly', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Collection media integration is certified once in Chromium.');

  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/collection/browser-games/');
    const selected = page.locator('[data-collection-preview="micro-arcade"]').first();
    await expect(selected).toBeVisible();
    const preview = selected.locator('[data-preview-slug="micro-arcade"]');
    await expect(preview).toHaveAttribute('data-preview-provenance', 'captured');
    await expect(preview.locator('img')).toHaveAttribute('src', '/projects/micro-arcade/screenshot-desktop.png');
    expect(await horizontalOverflow(page), `${width}px collection`).toBeLessThanOrEqual(1);
  }
});

test('light and dark themes preserve layout geometry', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Theme geometry is measured once in Chromium.');

  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto('/');
  const light = page.getByRole('button', { name: 'Light', exact: true }).first();
  const dark = page.getByRole('button', { name: 'Dark', exact: true }).first();
  await light.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  const targets = [page.locator('.universe-hero'), page.locator('#featured'), page.locator('.supporting-grid')];
  const before = await Promise.all(targets.map(geometry));
  await dark.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const after = await Promise.all(targets.map(geometry));

  for (const [index, beforeBox] of before.entries()) {
    const afterBox = after[index]!;
    expect(Math.abs(beforeBox.width - afterBox.width), `target ${index} width`).toBeLessThanOrEqual(1);
    expect(Math.abs(beforeBox.height - afterBox.height), `target ${index} height`).toBeLessThanOrEqual(1);
    expect(Math.abs(beforeBox.x - afterBox.x), `target ${index} x`).toBeLessThanOrEqual(1);
  }
});

test('records representative visual evidence for final manual inspection', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Visual evidence is captured once from Chromium.');
  await fs.rm(visualEvidenceDir, { recursive: true, force: true });

  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  await saveViewportEvidence(page, '01-home-320-light');
  await saveElementEvidence(page.locator('.flagship-card'), '02-flagship-320-light');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/project/pdf-studio/');
  await saveElementEvidence(page.locator('.record__hero'), '03-pdf-studio-record-390');

  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/');
  await saveElementEvidence(page.locator('.universe-grid'), '04-featured-768-light');

  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/collection/browser-games/');
  await saveElementEvidence(page.locator('.collection-map-shell__workspace'), '05-browser-games-map-1024');

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const light = page.getByRole('button', { name: 'Light', exact: true }).first();
  const dark = page.getByRole('button', { name: 'Dark', exact: true }).first();
  await light.click();
  await saveViewportEvidence(page, '06-home-1440-light');
  await dark.click();
  await saveElementEvidence(page.locator('.universe-grid'), '07-featured-1440-dark');
});

test('@mobile-cert important text-only navigation keeps 44px touch height', async ({ page }) => {
  await page.goto('/project/pdf-studio/');
  const projectTargets = page.locator('.record__actions a:visible, .record__index-links a:visible, .record__end a:visible');
  for (let index = 0; index < await projectTargets.count(); index += 1) {
    const box = await projectTargets.nth(index).boundingBox();
    if (!box) continue;
    expect(box.height, `project target ${index}`).toBeGreaterThanOrEqual(43.5);
  }

  await page.goto('/');
  const homeTargets = page.locator('.universe-hero__actions a:visible, .flagship-card__actions a:visible, .section-heading .text-link:visible');
  for (let index = 0; index < await homeTargets.count(); index += 1) {
    const box = await homeTargets.nth(index).boundingBox();
    if (!box) continue;
    expect(box.height, `home target ${index}`).toBeGreaterThanOrEqual(43.5);
  }
});

test('@mobile-cert short mobile viewport keeps navigation and search controls reachable', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Menu' });
  await trigger.click();
  const menu = page.getByRole('dialog', { name: 'Navigation' });
  await expect(menu).toBeVisible();
  const closeMenu = page.getByRole('button', { name: 'Close navigation menu' });
  await expect(closeMenu).toBeVisible();
  const menuBox = await closeMenu.boundingBox();
  expect(menuBox?.y ?? 9999).toBeLessThan(640);
  await closeMenu.click();

  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
  const search = page.getByRole('dialog', { name: 'Find a project' });
  await expect(search).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close project search' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Search projects and collections' })).toBeVisible();
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
});
