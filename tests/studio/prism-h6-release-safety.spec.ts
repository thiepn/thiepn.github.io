import { test, expect } from '@playwright/test';

// Synthetic fixture acceptance only. No real provider OAuth, live devices or
// production release is implied by these browser regressions.
for (const width of [390, 1440]) {
  test(`H6 privacy-safe release recovery preserves keyboard landmarks at ${width}px`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/home/prism-preview/');
    const home = page.locator('[data-prism-home]');
    await expect(home).toBeVisible();
    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'THIEPN navigation' }).first()).toBeAttached();

    // The preview is intentionally unapproved for privileged connection.
    await expect(page.locator('[data-prism-library-status]')).toContainText(
      'Connection is available only on the qualified Home route.'
    );
    await expect(page.locator('[data-prism-recent-content]')).toHaveAttribute('data-prism-provider-state', 'disconnected');
    await expect(page.locator('[data-prism-now-list]')).toHaveAttribute('data-prism-provider-state', 'disconnected');

    const open = page.locator('[data-prism-account-open]:visible').first();
    await open.focus();
    await open.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Account' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Close account' })).toBeFocused();
    await expect(dialog.locator('[data-prism-library-status]')).toHaveAttribute('aria-live', 'polite');
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(open).toBeFocused();

    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await expect(page.locator('[data-prism-library-status]')).toContainText('Offline.');
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(page.locator('[data-prism-now-list]')).toHaveAttribute('data-prism-provider-state', 'disconnected');
    await expect(page.locator('[data-prism-recent-content]')).toHaveAttribute('data-prism-provider-state', 'disconnected');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}

test('H6 two-tab revoked device data cannot be restored by malformed or late clear messages', async ({ context }) => {
  const a = await context.newPage();
  const b = await context.newPage();
  await Promise.all([a.goto('/home/prism-preview/'), b.goto('/home/prism-preview/')]);

  await a.evaluate(() => {
    const c = new BroadcastChannel('thiepn:hub-library:clear:v1');
    c.postMessage({ type: 'clear', token: 'simulated-leak' });
    c.close();
  });
  await expect(b.locator('[data-prism-library-status]')).toContainText(
    'Connection is available only on the qualified Home route.'
  );

  await a.evaluate(() => {
    const c = new BroadcastChannel('thiepn:hub-library:clear:v1');
    c.postMessage({ type: 'clear' });
    c.close();
  });
  await expect(b.locator('[data-prism-library-status]')).toContainText(
    'Library sharing cleared in another tab.'
  );
  await b.reload();
  await expect(b.locator('[data-prism-library-status]')).toContainText(
    'Connection is available only on the qualified Home route.'
  );
  await expect(b.locator('[data-prism-continue-title]')).toContainText('No activity connected yet');
  await expect(b.locator('[data-prism-now-list]')).toHaveAttribute('data-prism-provider-state', 'disconnected');
});
