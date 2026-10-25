import {test,expect} from '@playwright/test';
import {hubFixture} from './launch-fixture';
import {additionalShortcutLaunches} from '../../src/lib/launches/shortcut-directory';

test('DISPOSABLE fixture: exactly one independently signed app is in Released roster',async({page})=>{
  await page.goto('/dev/release-apps/');
  await expect(page.locator('[data-hub-item]')).toHaveCount(1);
  await expect(page.locator('[data-hub-item][data-hub-slug="tms60"]')).toHaveCount(1);
  await expect(page.locator('[data-hub-current-app]')).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Released apps'}).first()).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content','noindex,nofollow');
  await expect(page.getByText('No apps have passed release certification.')).toHaveCount(0);
});
test('DISPOSABLE fixture: 31 legacy app identities and 12 shortcuts stay unchanged',async({page})=>{
  await page.goto('/apps/');
  await expect(page.locator('[data-hub-item]')).toHaveCount(hubFixture.expectedCount);
  await expect(page.locator('[data-hub-current-app]')).toHaveCount(additionalShortcutLaunches.length);
  await expect(page.locator('[data-hub-item][data-hub-slug="tms60"]')).toHaveCount(1);
});
