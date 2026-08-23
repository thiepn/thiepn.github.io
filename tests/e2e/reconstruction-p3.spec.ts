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

  await action.scrollIntoViewIfNeeded();
  await expect(action).toBeVisible();
  await expect(arrow).toHaveText('→');
  await page.waitForTimeout(80);

  const measureAction = () => action.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      documentX: rect.x + window.scrollX,
      documentY: rect.y + window.scrollY,
      width: rect.width,
      height: rect.height,
      transform: getComputedStyle(element).transform,
    };
  });

  const actionBefore = await measureAction();
  await action.hover();
  await page.waitForTimeout(180);
  const arrowTransform = await arrow.evaluate((element) => getComputedStyle(element).transform);
  const actionAfter = await measureAction();

  // WebKit may adjust viewport scroll while Playwright positions the pointer.
  // Document coordinates distinguish that browser scrolling from real element movement.
  expect(arrowTransform).not.toBe('none');
  expect(actionBefore.transform).toBe('none');
  expect(actionAfter.transform).toBe('none');
  expect(actionAfter.documentX).toBeCloseTo(actionBefore.documentX, 1);
  expect(actionAfter.documentY).toBeCloseTo(actionBefore.documentY, 1);
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
