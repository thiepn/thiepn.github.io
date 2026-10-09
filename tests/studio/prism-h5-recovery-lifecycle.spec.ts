import { test, expect } from '@playwright/test';

const route = '/home/prism-preview/';

for (const width of [390, 1440]) {
  test(`H5 Account dialog restores keyboard focus and announces private-connection states at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(route);
    const trigger = page.locator('[data-prism-account-open]:visible').first();
    await trigger.focus();
    await trigger.press('Enter');
    const dialog = page.locator('#prism-account-dialog');
    await expect(dialog).toBeVisible();
    const close = dialog.locator('[data-prism-account-close]');
    await expect(close).toBeFocused();
    const status = dialog.locator('[data-prism-library-status]');
    await expect(status).toHaveAttribute('role', 'status');
    await expect(status).toHaveAttribute('aria-live', 'polite');
    await expect(status).toHaveAttribute('aria-atomic', 'true');
    await expect(dialog.getByRole('button', { name: 'Connect Library' })).toBeAttached();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });

  test(`H5 offline/online transition cannot silently restore Library private data at ${width}px`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(route);
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await expect(page.locator('[data-prism-library-status]')).toContainText('Offline. Library sharing cleared');
    await expect(page.locator('[data-prism-now-list]')).toHaveAttribute('data-prism-provider-state', 'disconnected');
    await expect(page.locator('[data-prism-recent-content]')).toHaveAttribute('data-prism-provider-state', 'disconnected');
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(page.locator('[data-prism-library-status]')).toContainText('reconnect when online');
    await expect(page.locator('[data-prism-continue-title]')).toContainText('No activity connected yet');
  });
}

test('H5 device Library invalidation clears another Home tab without carrying private metadata', async ({ context }) => {
  const first = await context.newPage();
  const second = await context.newPage();
  await Promise.all([first.goto(route), second.goto(route)]);
  await expect(second.locator('[data-prism-library-status]')).toContainText('Library connection is available only on the qualified Home route.');
  await first.evaluate(() => {
    const channel = new BroadcastChannel('thiepn:hub-library:clear:v1');
    channel.postMessage({ type: 'clear' });
    channel.close();
  });
  await expect(second.locator('[data-prism-library-status]')).toContainText('Library sharing cleared in another tab');
  await expect(second.locator('[data-prism-continue-title]')).toContainText('No activity connected yet');
  await expect(second.locator('[data-prism-now-list]')).toHaveAttribute('data-prism-provider-state', 'disconnected');
});
