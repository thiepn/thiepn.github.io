import { test, expect } from '@playwright/test';

test('Habits V0 persists a manual check-in, undo and weekly target in device mode', async ({ page }) => {
  await page.goto('/home/prism-preview/habits/');
  await expect(page.locator('[data-habits-panel]')).toBeVisible();
  const row = page.locator('[data-habit-id="verses"]');
  const check = row.locator('[data-habit-check]');
  await expect(check).not.toBeChecked();
  await check.check();
  await expect(row.locator('[data-habit-count]')).toContainText('1 / 6');
  await page.reload();
  await expect(page.locator('[data-habit-id="verses"] [data-habit-check]')).toBeChecked();
  await page.locator('[data-habit-id="verses"] [data-habit-edit]').click();
  await page.locator('[data-habit-id="verses"] [data-habit-target]').selectOption('3');
  await page.locator('[data-habit-id="verses"] [data-habit-save]').click();
  await expect(page.locator('[data-habit-id="verses"] [data-habit-count]')).toContainText('1 / 3');
  await check.uncheck();
  await expect(row.locator('[data-habit-count]')).toContainText('0 / 3');
});

test('Habits V0 rejects unsafe launch URLs without altering a valid saved link', async ({ page }) => {
  await page.goto('/home/prism-preview/habits/');
  const row = page.locator('[data-habit-id="french"]');
  await row.locator('[data-habit-edit]').click();
  await row.locator('[data-habit-url]').fill('javascript:alert(1)');
  await row.locator('[data-habit-save]').click();
  await expect(row.locator('[data-habit-error]')).toBeVisible();
  await expect(row.locator('[data-habit-editor]')).toBeVisible();
});

test('Habits V0 renders usable mobile controls without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/home/prism-preview/habits/');
  await expect(page.getByRole('heading', { name: 'Today & habits' })).toBeVisible();
  await expect(page.locator('[data-habit-id]')).toHaveCount(7);
  await page.locator('[data-habit-id="devotion"] [data-habit-edit]').click();
  await expect(page.locator('[data-habit-id="devotion"] [data-habit-url]')).toBeVisible();
  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflows).toBe(false);
});
