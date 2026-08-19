import { test, expect } from '@playwright/test';

test('homepage initializes the Living Index motion layer without changing navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-index-hero]')).toHaveAttribute('data-hero-motion', 'active');
  await expect(page.locator('[data-living-index]')).toHaveAttribute('data-living-index-mode', 'proximity');
  await expect(page.locator('[data-index-fragment]')).toHaveCount(7);
  await expect(page.getByRole('heading', { name: 'THIEPN.' })).toBeVisible();
});

test('fine-pointer proximity wakes a fragment and never moves it more than two pixels', async ({ page }) => {
  await page.goto('/');
  const fragment = page.locator('[data-index-fragment]').first();
  const box = await fragment.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(260);
  await expect(fragment).toHaveAttribute('data-awake', 'true');
  const offsets = await fragment.evaluate((element) => ({
    x: parseFloat(getComputedStyle(element).getPropertyValue('--proximity-x')) || 0,
    y: parseFloat(getComputedStyle(element).getPropertyValue('--proximity-y')) || 0,
  }));
  expect(Math.hypot(offsets.x, offsets.y)).toBeLessThanOrEqual(2);
});

test('reduced motion keeps the Living Index static and suppresses the scanner', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4321/');
  await expect(page.locator('[data-index-hero]')).toHaveAttribute('data-hero-motion', 'static');
  await expect(page.locator('[data-living-index]')).toHaveAttribute('data-living-index-mode', 'static');
  await expect(page.locator('[data-index-scanner]')).toBeHidden();
  await context.close();
});

test('scroll section reveals are one-shot and archive filters remain functional', async ({ page }) => {
  await page.goto('/');
  const featured = page.locator('#featured');
  await featured.scrollIntoViewIfNeeded();
  await expect(featured).toHaveAttribute('data-motion-revealed', 'true');
  await page.locator('#projects').scrollIntoViewIfNeeded();
  await page.locator('#projects').getByRole('button', { name: 'Games', exact: true }).click();
  await expect(page.locator('#projects [data-archive-result-count]')).toHaveText('009');
  await expect(page).toHaveURL(/category=games/);
});

test('touch-sized viewport never depends on proximity hover', async ({ browser, browserName }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, ...(browserName === 'firefox' ? {} : { isMobile: true }) });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4321/');
  await expect(page.locator('[data-living-index]')).toHaveAttribute('data-living-index-mode', 'mobile');
  await expect(page.locator('[data-index-scanner]')).toBeHidden();
  await expect(page.getByRole('link', { name: /View .* details/ }).first()).toBeVisible();
  await context.close();
});
