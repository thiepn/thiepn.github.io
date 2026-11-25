import { test, expect } from '@playwright/test';
test('excluded Folio source is not offered on any Home mode', async ({page}) => {
  test.setTimeout(60_000); // Three real navigations; do not wait for unrelated iframe/assets.
  for (const route of ['/', '/?mode=today', '/?mode=focus']) {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.ok()).toBe(true);
    await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
    await expect(page.locator('[data-folio-device], [data-source-today-folio], [data-action="connect-folio"]')).toHaveCount(0);
  }
});
