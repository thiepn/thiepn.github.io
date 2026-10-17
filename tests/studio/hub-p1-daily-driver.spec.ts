import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

test('desktop P1 Today prioritizes real work and preserves native planning navigation',async ({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/');
  await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
  await expect(page.locator('[data-workspace][data-view=home]')).toBeVisible();
  await expect(page.locator('#ws-title')).toHaveText('Today');
  await expect(page.locator('[data-unified-today]')).toBeVisible();
  await expect(page.locator('[data-today-workbench]')).toBeVisible();
  await expect(page.locator('.ws-workbench-day')).toHaveCount(7);
  await expect(page.locator('[data-workbench-source-actions]')).toContainText('Hub-only view');
  await expect(page.locator('[data-today-workbench]')).toContainText('Tracker check-in');
  await expect(page.locator('[data-today-workbench]')).toContainText('Pick up a note');
  await expect(page.locator('[data-source-queue]')).toBeVisible();
  await expect(page.locator('[data-source-queue]')).toContainText('No owner summaries are available');
  await expect(page.locator('.ws-nav a[href="/"]')).toContainText('Today');
  await expect(page.locator('.ws-nav a[href="/home/calendar/"]')).toContainText('Plan');
  await page.locator('.ws-unified-head-actions [data-action=capture]').click();
  await expect(page.locator('[data-workspace-dialog]')).toBeVisible();
  await page.locator('[data-workspace-dialog] [data-action=close-dialog]').first().click();
  await page.locator('.ws-nav a[href="/home/calendar/"]').click();
  await expect(page.locator('[data-workspace][data-view=calendar]')).toBeVisible();
  await expect(page.locator('[data-planning-review]')).toBeVisible();
  await expect(page.locator('.ws-nav a[href="/home/calendar/"]')).toHaveAttribute('aria-current','page');
});

test('mobile retains Today, Apps and Tasks as direct navigation, with Plan in More',async ({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
  await expect(page.locator('[data-unified-today]')).toBeVisible();
  await expect(page.locator('[data-source-queue]')).toBeVisible();
  const primary=page.locator('.ws-mobile-nav');
  await expect(primary.locator('a[href="/"]')).toContainText('Today');
  await expect(primary.locator('a[href="/apps/"]')).toContainText('Apps');
  await expect(primary.locator('a[href="/home/tasks/"]')).toContainText('Tasks');
  await primary.locator('[data-more-trigger]').click();
  await expect(page.locator('#ws-more')).toBeVisible();
  await expect(page.locator('#ws-more a[href="/home/calendar/"]')).toContainText('Plan');
  await page.locator('[data-more-close]').click();
  await expect(page.locator('#ws-more')).not.toBeVisible();
  const widths=await page.evaluate(()=>({
    document:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,
  }));
  expect(widths.document).toBeLessThanOrEqual(widths.viewport);
});
