import { test, expect } from '@playwright/test';

const route = '/home/prism-preview/';

for (const width of [390, 1440]) {
  test(`H4 provider-aware default at ${width}px is private and explicitly disconnected`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(route);

    const home = page.locator('[data-prism-home]');
    await expect(home).toBeVisible();
    await expect(page.locator('[data-prism-now-list]')).toHaveAttribute('data-prism-provider-state', 'disconnected');
    await expect(page.locator('[data-prism-study-content]')).toHaveAttribute('data-prism-provider-state', 'disconnected');
    await expect(page.locator('[data-prism-recent-content]')).toHaveAttribute('data-prism-provider-state', 'disconnected');

    await expect(page.locator('[data-prism-continue-title]')).toContainText('No activity connected yet');
    await expect(page.locator('[data-prism-now-list]')).toContainText('No connected attention items');
    await expect(page.locator('[data-prism-study-content]')).toContainText('No study progress connected yet');
    await expect(page.locator('[data-prism-recent-content]')).toContainText('No recent activity connected yet');

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}
