import { test, expect } from '@playwright/test';

test('Office O1 writing-first layout preserves document navigation and save access', async ({ page }) => {
  await page.goto('/home/documents/');
  await expect(page.locator('[data-office-new]')).toBeEnabled();
  await page.locator('[data-office-new]').click();
  const desk = page.locator('#office-writing-desk');
  const body = page.locator('[data-office-body]');
  await expect(desk.locator('[data-office-body]')).toBeEnabled();
  await expect(desk.locator('[data-office-save]')).toBeEnabled();
  await expect(desk.locator('[data-office-status]')).toBeVisible();
  await expect(page.locator('.office-list [data-office-list] .office-entry')).toHaveCount(1);
  expect(await page.evaluate(() => {
    const first = document.querySelector('#office-writing-desk')!;
    return ['#office-library-tools', '#office-history-tools', '#office-reference-tools', '#office-table-tools'].every(selector =>
      Boolean(first.compareDocumentPosition(document.querySelector(selector)!) & Node.DOCUMENT_POSITION_FOLLOWING));
  })).toBe(true);
  await body.fill('# Writing first');
  await page.locator('[data-office-save]').click();
  await expect(page.locator('[data-office-status]')).toContainText('Saved locally');
  const nav = page.getByRole('navigation', { name: 'Document tools' });
  const link = nav.getByRole('link', { name: 'History', exact: true });
  await link.focus();
  await link.press('Enter');
  await expect(page).toHaveURL(/#office-history-tools$/);
  await expect(page.locator('#office-history-tools')).toBeFocused();
  await nav.getByRole('link', { name: 'Back to editor' }).click();
  await expect(page).toHaveURL(/#office-writing-desk$/);
  await page.reload();
  await expect(body).toHaveValue('# Writing first');
});

test('Office O1 narrow layout keeps management operations after writing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/home/documents/');
  await expect(page.locator('[data-office-new]')).toBeEnabled();
  await page.locator('[data-office-new]').click();
  const body = page.locator('[data-office-body]');
  await expect(body).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.querySelector('#office-writing-desk')!.getBoundingClientRect().top <
    document.querySelector('#office-library-tools')!.getBoundingClientRect().top)).toBe(true);
  await body.fill('Mobile draft');
  await expect(page.locator('[data-office-status]')).toContainText('Saved locally');
  await page.reload();
  await expect(body).toHaveValue('Mobile draft');
});
