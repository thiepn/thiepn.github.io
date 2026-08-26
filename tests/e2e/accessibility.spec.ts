import { expect, test } from '@playwright/test';

test('skip link moves keyboard focus to main content', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to main content' });
  await expect(skip).toBeFocused();
  await skip.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
});

test('desktop navigation exposes current-page semantics', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.site-nav a[aria-current="page"]')).toHaveText('Home');
  await page.goto('/projects/');
  await expect(page.locator('.site-nav a[aria-current="page"]')).toHaveText('Projects');
  await page.goto('/project/pdf-studio/');
  await expect(page.locator('.site-nav a[aria-current="page"]')).toHaveText('Projects');
  await page.goto('/collection/french-learning/');
  await expect(page.locator('.site-nav a[aria-current="page"]')).toHaveText('Collections');
});

test('reduced motion collapses transition durations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const duration = await page.locator('body').evaluate((element) => getComputedStyle(element).transitionDuration);
  const seconds = duration.split(',').map((value) => value.trim()).map((value) => value.endsWith('ms') ? Number.parseFloat(value) / 1000 : Number.parseFloat(value));
  expect(Math.max(...seconds)).toBeLessThanOrEqual(.001);
});

test('forced colors keeps primary portfolio structure and controls visible', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'forced-colors emulation is certified in Chromium; CSS fallback is source-audited for all engines.');
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'THIEPN', level: 1 })).toBeVisible();
  const browse = page.getByRole('link', { name: 'Explore projects', exact: true });
  await expect(browse).toBeVisible();
  const buttonBorder = await browse.evaluate((element) => getComputedStyle(element).borderTopStyle);
  expect(buttonBorder).not.toBe('none');
});

test('text-spacing stress does not produce horizontal page overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/project/echoframe-last-signal/');
  await page.addStyleTag({ content: `
    p, li, dd, dt, a, button { line-height: 1.8 !important; letter-spacing: .08em !important; word-spacing: .12em !important; }
  ` });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

test('empty categories are not misleading links in the dedicated project browser', async ({ page }) => {
  await page.goto('/projects/');
  const resources = page.locator('.category-index__row').filter({ hasText: 'Resources' });
  await expect(resources).toHaveAttribute('aria-disabled', 'true');
  await expect(resources.locator('a')).toHaveCount(0);
});
