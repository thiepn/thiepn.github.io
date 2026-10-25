import { test, expect } from '@playwright/test';
import { hubFixture } from './launch-fixture';
import { additionalShortcutLaunches } from '../../src/lib/launches/shortcut-directory';
test('only approved certificates appear in isolated Released apps (currently none)', async ({page}) => {
  await page.goto('/dev/release-apps/');
  await expect(page.getByRole('heading',{name:'Released apps'})).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('No apps have passed release certification.');
  await expect(page.locator('[data-hub-item]')).toHaveCount(0);
  await expect(page.locator('[data-hub-current-app]')).toHaveCount(0);
  await expect(page.locator('[data-hub-category]')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex,nofollow');
});
test('existing /apps legacy published and shortcut rosters are preserved',async({page})=>{
  await page.goto('/apps/');
  await expect(page.locator('[data-hub-item]')).toHaveCount(hubFixture.expectedCount);
  await expect(page.locator('[data-hub-current-app]')).toHaveCount(additionalShortcutLaunches.length);
  await expect(page.locator('[data-hub-item][data-hub-slug="tms60"]')).toHaveCount(1);
  await expect(page.locator('[data-hub-current-app="chinese"]')).toHaveCount(1);
});
