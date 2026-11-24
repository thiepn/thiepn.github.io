import { test, expect } from '@playwright/test';
test('excluded Folio source is not offered on any Home mode', async ({page}) => {
  for (const route of ['/', '/?mode=today', '/?mode=focus']) {
    await page.goto(route);
    await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
    await expect(page.locator('[data-folio-device], [data-source-today-folio], [data-action="connect-folio"]')).toHaveCount(0);
  }
});
