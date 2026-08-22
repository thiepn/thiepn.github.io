import { test, expect } from '@playwright/test';

test('synthetic PDF Studio preview follows poster → armed → active → poster lifecycle', async ({ page }) => {
  await page.goto('/');
  const root = page.locator('[data-preview-slug="pdf-studio"]').first();
  await expect(root).toHaveAttribute('data-preview-state', 'poster');
  await root.hover();
  await expect(root).toHaveAttribute('data-preview-state', 'armed');
  await page.waitForTimeout(230);
  await expect(root).toHaveAttribute('data-preview-state', 'active');
  await page.mouse.move(0, 0);
  await expect(root).toHaveAttribute('data-preview-state', 'poster');
});

test('WORDSTRIKE video is lazy and only receives a source after interaction', async ({ page }) => {
  await page.goto('/');
  const root = page.locator('[data-preview-slug="wordstrike"]').first();
  const video = root.locator('[data-preview-video]');
  await expect(video).not.toHaveAttribute('src', /.+/);
  await root.hover();
  await expect(video).toHaveAttribute('src', /projects\/wordstrike\/preview\.webm/);
  await page.waitForTimeout(380);
  await expect(root).toHaveAttribute('data-preview-state', 'active');
});

test('global desktop controller never leaves more than two previews active', async ({ page }) => {
  await page.goto('/');
  const pdf = page.locator('[data-preview-slug="pdf-studio"]').first();
  const manuscript = page.locator('[data-preview-slug="manuscript"]').first();
  const strike = page.locator('[data-preview-slug="wordstrike"]').first();
  await pdf.hover(); await page.waitForTimeout(230);
  await manuscript.hover(); await page.waitForTimeout(230);
  await strike.hover(); await page.waitForTimeout(330);
  expect(await page.locator('[data-preview-state="active"]').count()).toBeLessThanOrEqual(2);
});

test('leaving viewport resets an animated preview', async ({ page }) => {
  await page.goto('/');
  const root = page.locator('[data-preview-slug="manuscript"]').first();
  await root.hover(); await page.waitForTimeout(230);
  await expect(root).toHaveAttribute('data-preview-state', 'active');
  await page.locator('footer').scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);
  await expect(root).toHaveAttribute('data-preview-state', 'poster');
});

test('reduced motion never starts animated previews', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4321/');
  const root = page.locator('[data-preview-slug="pdf-studio"]').first();
  await root.hover();
  await page.waitForTimeout(350);
  await expect(root).toHaveAttribute('data-preview-state', 'poster');
  await context.close();
});

test('touch/mobile keeps previews poster-first with no hover dependency', async ({ browser, browserName }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, ...(browserName === 'firefox' ? {} : { isMobile: true }) });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4321/');
  const roots = page.locator('[data-preview-root]');
  await expect(roots.first()).toHaveAttribute('data-preview-state', 'poster');
  expect(await page.locator('[data-preview-state="active"]').count()).toBe(0);
  await context.close();
});
