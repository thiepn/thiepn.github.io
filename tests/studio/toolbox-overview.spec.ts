import {hubFixture} from './launch-fixture';
import {additionalShortcutLaunches} from '../../src/lib/launches/shortcut-directory';
import { test, expect } from '@playwright/test';

const hub=hubFixture;
const expectedCounts = hub.expectedCategoryCounts;
const shortcutCount = (category: string): number =>
  additionalShortcutLaunches.filter(app => app.category === category).length;
const totalCounts = Object.fromEntries(Object.entries(expectedCounts).map(([category, count]) => [
  category, count + shortcutCount(category)
]));

for (const width of [320, 375, 768, 1440]) for (const theme of ['light', 'dark'] as const) {
  test(`Hub cards and filters stay readable ${width} ${theme}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 960 });
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/apps/');

    const catalogue = page.locator('[data-hub-catalogue]');
    await expect(catalogue).toBeVisible();
    await expect(catalogue.locator('[data-hub-item]')).toHaveCount(hub.expectedCount);
    await expect(catalogue.locator('[data-hub-current-app]')).toHaveCount(additionalShortcutLaunches.length);
    await expect(catalogue.locator('.hub-category')).toHaveCount(7);
    await expect(catalogue.locator('[data-hub-search]')).toHaveCount(0);

    for (const [category, count] of Object.entries(totalCounts)) {
      const button = catalogue.locator(`button[data-hub-category="${category}"]`);
      await expect(button).toBeVisible();
      await expect(button).toContainText(String(count));
    }

    for (const card of await catalogue.locator('[data-hub-item]').all()) {
      await expect(card.locator('h2')).toBeVisible();
      await expect(card.getByRole('link', { name: 'Open app', exact: false })).toBeVisible();
      expect(await card.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await testInfo.attach(`hub-${width}-${theme}`, { body: await catalogue.screenshot(), contentType: 'image/png' });
  });
}

test('Tiny Tools appears once as an ordinary Hub app card, not an embedded toolbox', async ({ page }) => {
  await page.goto('/apps/');
  await expect(page.getByRole('heading', { name: 'Tiny Tools', exact: true })).toHaveCount(1);
  await expect(page.locator('#tiny-tools')).toHaveCount(0);
  await expect(page.locator('[data-toolbox-overview]')).toHaveCount(0);
  await expect(page.locator('[data-toolbox-family]')).toHaveCount(0);

  const tinyToolsCard = page.locator('[data-hub-item]').filter({ has: page.getByRole('heading', { name: 'Tiny Tools', exact: true }) });
  await expect(tinyToolsCard).toHaveCount(1);
  await expect(tinyToolsCard.getByRole('link', { name: 'Open app', exact: false })).toHaveAttribute('href', '/tools/');
  await expect(tinyToolsCard.getByRole('link', { name: 'Details', exact: true })).toHaveAttribute('href', '/project/tiny-tools/');
});

test('each category filter reveals exactly its locked app count', async ({ page }) => {
  await page.goto('/apps/');
  const publishedCards = page.locator('[data-hub-item]:visible');
  const shortcutCards = page.locator('[data-hub-current-app]:visible');
  for (const [category, count] of Object.entries(expectedCounts)) {
    const button = page.locator(`button[data-hub-category="${category}"]`);
    await button.click();
    await expect(publishedCards).toHaveCount(count);
    await expect(shortcutCards).toHaveCount(shortcutCount(category));
    await expect(button).toContainText(String(totalCounts[category]));
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  }
});
