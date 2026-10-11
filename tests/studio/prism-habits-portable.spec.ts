import { expect, test } from '@playwright/test';
import { createHabitsV0, localDayKey } from '../../src/lib/prism/habits-v0';
import { createHabitsBackup } from '../../src/lib/prism/habits-backup';

test('Habits V1 stages, cancels and explicitly imports local check-ins', async ({ page }) => {
  await page.goto('/home/prism-preview/habits/');
  await page.locator('[data-habit-id="french"] [data-habit-check]').check();
  const backup = createHabitsV0();
  backup.dates.music = [localDayKey(new Date())];
  const json = createHabitsBackup(backup, { kind: 'device' });
  const select = async () => page.locator('[data-habits-import]').setInputFiles({
    name: 'habits.json', mimeType: 'application/json', buffer: Buffer.from(json),
  });
  await select();
  await expect(page.locator('[data-habits-import-review]')).toBeVisible();
  await expect(page.locator('[data-habit-id="french"] [data-habit-check]')).toBeChecked();
  await page.locator('[data-habits-import-cancel]').click();
  await expect(page.locator('[data-habit-id="french"] [data-habit-check]')).toBeChecked();
  await select();
  await page.locator('[data-habits-import-confirm]').click();
  await expect(page.locator('[data-habit-id="french"] [data-habit-check]')).not.toBeChecked();
  await page.reload();
  await expect(page.locator('[data-habit-id="music"] [data-habit-check]')).toBeChecked();
});
test('Habits V1 rejects cross-account import without overwriting check-ins', async ({ page }) => {
  await page.goto('/home/prism-preview/habits/');
  await page.locator('[data-habit-id="reading"] [data-habit-check]').check();
  const json = createHabitsBackup(createHabitsV0(), { kind: 'account', owner: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' });
  await page.locator('[data-habits-import]').setInputFiles({
    name: 'other.json', mimeType: 'application/json', buffer: Buffer.from(json),
  });
  await expect(page.locator('[data-habits-portability-status]')).toContainText('different account');
  await expect(page.locator('[data-habits-import-review]')).toBeHidden();
  await expect(page.locator('[data-habit-id="reading"] [data-habit-check]')).toBeChecked();
});
test('Habits V1 downloads a local backup on direct user action', async ({ page }) => {
  await page.goto('/home/prism-preview/habits/');
  const [download] = await Promise.all([
    page.waitForEvent('download'), page.locator('[data-habits-export]').click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^thiepn-habits-\d{4}-\d{2}-\d{2}\.json$/);
});
