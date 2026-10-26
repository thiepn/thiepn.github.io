import {hubFixture} from './launch-fixture';
import { test, expect } from '@playwright/test';
import { additionalShortcutLaunches } from '../../src/lib/launches/shortcut-directory';

const hub=hubFixture;
const publishedCounts = hub.expectedCategoryCounts;
const currentApps = additionalShortcutLaunches;
const currentCounts: Record<string, number> = Object.fromEntries(
  Object.keys(publishedCounts).map(category => [
    category, currentApps.filter(app => app.category === category).length,
  ]),
);
const displayedCounts = Object.fromEntries(
  Object.entries(publishedCounts).map(([category, count]) => [
    category, count + currentCounts[category]!,
  ]),
);

for (const width of [320, 375, 768, 1440]) for (const theme of ['light', 'dark'] as const) {
  test(`Hub cards and filters stay readable ${width} ${theme}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 960 });
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/apps/');

    const catalogue = page.locator('[data-hub-catalogue]');
    await expect(catalogue).toBeVisible();
    await expect(catalogue.locator('[data-hub-item]')).toHaveCount(hub.expectedCount);
    await expect(catalogue.locator('[data-hub-current-app]')).toHaveCount(currentApps.length);
    await expect(catalogue.locator('[data-hub-category="all"] span')).toHaveText(String(hub.expectedCount + currentApps.length));
    await expect(catalogue.locator('#hub-published-title')).toHaveText('Published apps');
    await expect(catalogue.locator('.hub-category')).toHaveCount(7);
    await expect(catalogue.locator('[data-hub-search]')).toHaveCount(0);

    for (const [category, count] of Object.entries(displayedCounts)) {
      const button = catalogue.locator(`button[data-hub-category="${category}"]`);
      await expect(button).toBeVisible();
      await expect(button.locator('span')).toHaveText(String(count));
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
  const visibleCards = page.locator('[data-hub-item]:visible');
  const visibleShortcuts = page.locator('[data-hub-current-app]:visible');
  const currentSection = page.locator('[data-hub-current-section]');
  for (const [category, count] of Object.entries(publishedCounts)) {
    const button = page.locator(`button[data-hub-category="${category}"]`);
    await button.click();
    await expect(visibleCards).toHaveCount(count);
    await expect(visibleShortcuts).toHaveCount(currentCounts[category]!);
    await expect(button.locator('span')).toHaveText(String(displayedCounts[category]!));
    if (currentCounts[category]) await expect(currentSection).toBeVisible();
    else await expect(currentSection).toBeHidden();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  }
});

test('current app destinations remain opt-in while historical IDs are retained', async ({ page }) => {
  expect(hub.historicalCount).toBe(31);
  expect(hub.expectedCount).toBe(30);
  expect(hub.projects.some(p=>p.slug==='notes')).toBe(true);
  expect(currentApps).toHaveLength(12);
  const published = new Set(hub.projects.map(project => project.slug));
  expect(new Set(currentApps.map(app => app.id)).size).toBe(currentApps.length);
  await page.goto('/apps/');
  for (const app of currentApps) {
    expect(published.has(app.id)).toBe(false);
    const item = page.locator(`[data-hub-current-app="${app.id}"]`);
    await expect(item).toHaveCount(1);
    await expect(item).toHaveAttribute('data-hub-current-category', app.category);
    await expect(item.locator('a.hub-current-link')).toHaveAttribute('href', app.url);
  }
  await expect(page.locator('[data-hub-item]')).toHaveCount(hub.expectedCount);
  await expect(page.locator('[data-hub-item]').filter({has:page.getByRole('heading',{name:'Notes',exact:true})})).toHaveCount(0);
});
