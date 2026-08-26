import { expect, test } from '@playwright/test';

const dates = async (locator: ReturnType<Parameters<typeof test>[0] extends never ? never : never>) => locator;

test('homepage exposes data-driven currently-building and recently-updated project activity', async ({ page }) => {
  await page.goto('/');

  const activity = page.locator('[data-project-activity]');
  await expect(activity).toBeVisible();
  await expect(activity.getByRole('heading', { name: 'Currently building' })).toBeVisible();
  await expect(activity.getByRole('heading', { name: 'Recently updated' })).toBeVisible();

  const building = page.locator('[data-currently-building] [data-activity-project]');
  const buildingCount = await building.count();
  expect(buildingCount).toBeGreaterThan(0);
  expect(buildingCount).toBeLessThanOrEqual(4);
  for (let index = 0; index < buildingCount; index += 1) {
    await expect(building.nth(index).locator('.status-label--beta')).toBeVisible();
  }

  const recent = page.locator('[data-recently-updated] [data-activity-project]');
  expect(await recent.count()).toBeGreaterThan(0);
});

test('activity lists sort newest first and do not duplicate current builds in the recent panel', async ({ page }) => {
  await page.goto('/');

  const building = page.locator('[data-currently-building] [data-activity-project]');
  const recent = page.locator('[data-recently-updated] [data-activity-project]');
  const buildingDates = await building.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-updated') ?? ''));
  const recentDates = await recent.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-updated') ?? ''));
  const buildingSlugs = new Set(await building.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-activity-project') ?? '')));
  const recentSlugs = await recent.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-activity-project') ?? ''));

  expect(buildingDates).toEqual([...buildingDates].sort().reverse());
  expect(recentDates).toEqual([...recentDates].sort().reverse());
  for (const slug of recentSlugs) expect(buildingSlugs.has(slug)).toBe(false);
});

test('canonical dateUpdated metadata flows through project snapshot and activity UI', async ({ page }) => {
  await page.goto('/project/pflegelern/');
  const snapshot = page.locator('[data-project-showcase]');
  const updatedFact = snapshot.locator('div').filter({ has: page.locator('dt', { hasText: 'Updated' }) }).first();
  await expect(updatedFact).toContainText('25 Aug 2026');

  await page.goto('/');
  const pflege = page.locator('[data-recently-updated] [data-activity-project="pflegelern"]');
  await expect(pflege).toBeVisible();
  await expect(pflege).toHaveAttribute('data-updated', '2026-08-25');
});

test('project activity remains reflow-safe at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/');
  await expect(page.locator('[data-project-activity]')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const firstBuildingLink = page.locator('[data-currently-building] [data-activity-project] h4 a').first();
  await expect(firstBuildingLink).toBeVisible();
});
