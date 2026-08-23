import { expect, test } from '@playwright/test';

test('homepage entrance uses the restrained reconstructed motion path', async ({ page }) => {
  await page.goto('/');
  const hero = page.locator('[data-index-hero]');
  await expect(hero).toBeVisible();
  await expect.poll(async () => await hero.getAttribute('data-hero-motion')).toBe('active');
});

test('directional artifact actions move only their arrow cue', async ({ page }) => {
  await page.goto('/projects/');
  const action = page.locator('.artifact-actions__details').first();
  const arrow = action.locator('span[aria-hidden="true"]');

  // Position the real archive action before measuring it. Playwright's hover()
  // scrolls off-screen elements into view, so measuring first would compare two
  // different viewport positions rather than the hover interaction itself.
  await action.scrollIntoViewIfNeeded();
  await expect(action).toBeVisible();
  await expect(arrow).toHaveText('→');
  await page.waitForTimeout(80);

  const actionBefore = await action.evaluate((element) => element.getBoundingClientRect().toJSON());
  await action.hover();
  await page.waitForTimeout(180);
  const transform = await arrow.evaluate((element) => getComputedStyle(element).transform);
  const actionAfter = await action.evaluate((element) => element.getBoundingClientRect().toJSON());

  expect(transform).not.toBe('none');
  expect(actionAfter.x).toBeCloseTo(actionBefore.x, 1);
  expect(actionAfter.y).toBeCloseTo(actionBefore.y, 1);
  expect(actionAfter.width).toBeCloseTo(actionBefore.width, 1);
  expect(actionAfter.height).toBeCloseTo(actionBefore.height, 1);
});

test('catalogue search enters as an editorial plate and keeps selected-marker feedback', async ({ page }) => {
  await page.goto('/');
  await page.locator('.site-header__search').click();
  const dialog = page.locator('[data-catalogue-search-dialog]');
  await expect(dialog).toBeVisible();

  const animationName = await dialog.evaluate((element) => getComputedStyle(element).animationName);
  expect(animationName).toContain('index-dialog-in');

  const selected = dialog.locator('.catalogue-search__result.is-selected').first();
  await expect(selected).toBeVisible();
  const markerTransform = await selected.evaluate((element) => getComputedStyle(element, '::before').transform);
  expect(markerTransform).not.toContain('matrix(1, 0, 0, 0');
});

test('mobile navigation enters as one sliding plate without moving page chrome', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Menu' });
  const headerBefore = await page.locator('.site-header').evaluate((element) => element.getBoundingClientRect().toJSON());
  await trigger.click();

  const dialog = page.getByRole('dialog', { name: 'Navigation' });
  await expect(dialog).toBeVisible();
  const surface = dialog.locator('.mobile-menu__surface');
  expect(await surface.evaluate((element) => getComputedStyle(element).animationName)).toContain('index-plate-in');

  const headerAfter = await page.locator('.site-header').evaluate((element) => element.getBoundingClientRect().toJSON());
  expect(headerAfter.x).toBeCloseTo(headerBefore.x, 1);
  expect(headerAfter.width).toBeCloseTo(headerBefore.width, 1);
});

test('reduced motion keeps hero and dialog behavior static', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4321/');

  const hero = page.locator('[data-index-hero]');
  await expect.poll(async () => await hero.getAttribute('data-hero-motion')).toBe('static');

  await page.locator('.site-header__search').click();
  const dialog = page.locator('[data-catalogue-search-dialog]');
  await expect(dialog).toBeVisible();
  const durationSeconds = await dialog.evaluate((element) => {
    const value = getComputedStyle(element).animationDuration.trim();
    return value.endsWith('ms') ? Number.parseFloat(value) / 1000 : Number.parseFloat(value);
  });
  expect(durationSeconds).toBeLessThanOrEqual(.001);
  await context.close();
});
