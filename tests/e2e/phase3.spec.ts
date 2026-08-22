import { expect, test } from '@playwright/test';

const routes = ['/', '/projects/', '/project/pdf-studio/', '/collections/', '/collection/browser-games/', '/definitely-not-indexed/'];
const viewports = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 640, height: 900 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
];

test('mandatory Phase 3 viewports have no page-level horizontal overflow', async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const path of routes.slice(0, 5)) {
      await page.goto(path);
      const metrics = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
      expect(metrics.scrollWidth, `${path} @ ${viewport.width}px`).toBeLessThanOrEqual(metrics.innerWidth);
    }
  }
});

test('200% desktop zoom reflow equivalent remains usable at 640 CSS pixels', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 900 });
  for (const path of ['/', '/projects/', '/project/pdf-studio/', '/collection/french-learning/']) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow, path).toBe(false);
    await expect(page.locator('h1')).toBeVisible();
  }
});

test('mobile menu is modal, keyboard closable, and restores focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Menu' });
  await trigger.focus();
  await trigger.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Navigate / The Index' });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('link', { name: /Projects/ }).last()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('mobile header stays compact and primary desktop nav is replaced', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/projects/');
  await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
  await expect(page.locator('.site-nav')).toBeHidden();
  const headerHeight = await page.locator('.site-header').evaluate((element) => element.getBoundingClientRect().height);
  expect(headerHeight).toBeLessThanOrEqual(64);
});

test('tablet pages use the explicit grid-safe composition', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  for (const path of ['/', '/projects/', '/collection/browser-games/']) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow, path).toBe(false);
  }
});

test('each major page starts its document outline with one h1', async ({ page }) => {
  for (const path of routes) {
    await page.goto(path);
    const headings = await page.locator('h1,h2,h3').evaluateAll((nodes) => nodes.map((node) => ({ tag: node.tagName, text: node.textContent?.trim() })));
    expect(headings.filter((heading) => heading.tag === 'H1'), path).toHaveLength(1);
    expect(headings[0]?.tag, path).toBe('H1');
  }
});

test('touch-sized core controls meet the 44px target', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/project/pdf-studio/');
  const controls = page.locator('.structural-button, .artifact-actions a, .mobile-menu__trigger');
  const count = await controls.count();
  for (let index = 0; index < count; index++) {
    const box = await controls.nth(index).boundingBox();
    if (!box) continue;
    expect(Math.max(box.width, box.height)).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
});

test('no-hover/touch context keeps featured project cards readable without hover', async ({ browser, browserName }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, ...(browserName === 'firefox' ? {} : { isMobile: true }) });
  const page = await context.newPage();
  await page.goto('/');
  const card = page.locator('.featured-card').first();
  await expect(card).toBeVisible();
  const opacity = await card.evaluate((element) => Number.parseFloat(getComputedStyle(element).opacity));
  expect(opacity).toBeGreaterThanOrEqual(.85);
  await context.close();
});
