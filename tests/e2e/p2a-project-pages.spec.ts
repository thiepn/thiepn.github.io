import { expect, test } from '@playwright/test';

test('TBC project page exposes richer snapshot, verified evidence, and captured views', async ({ page }) => {
  await page.goto('/project/the-bible-challenge/');
  await expect(page.getByRole('heading', { name: 'The Bible Challenge', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Project snapshot', level: 2 })).toBeVisible();
  await expect(page.getByText('Release v4.1.0')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Why this exists', level: 3 })).toBeVisible();
  await expect(page.locator('[data-project-highlights]')).toContainText('5,799');
  await expect(page.locator('[data-project-highlights]')).toContainText('66');
  await expect(page.locator('[data-project-highlights]')).toContainText('5');
  await expect(page.locator('[data-project-highlights]')).toContainText('22');
  await expect(page.locator('#views img')).toHaveCount(2);
  await expect(page.locator('[data-record-primary-actions]').getByRole('link', { name: /Play/ })).toHaveAttribute('href', 'https://thiepn.dev/tbc/');
});

test('PDF Studio exposes verified release and technology metadata', async ({ page }) => {
  await page.goto('/project/pdf-studio/');
  await expect(page.getByRole('heading', { name: 'Project snapshot', level: 2 })).toBeVisible();
  await expect(page.getByText('Release v7.0.0')).toBeVisible();
  const stack = page.locator('[data-project-stack]');
  await expect(stack).toContainText('TypeScript');
  await expect(stack).toContainText('Vite');
  await expect(page.locator('[data-record-primary-actions]').getByRole('link', { name: /Open tool/ })).toBeVisible();
});

test('projects without showcase metadata still receive the derived snapshot without empty evidence blocks', async ({ page }) => {
  await page.goto('/project/manuscript/');
  await expect(page.getByRole('heading', { name: 'Project snapshot', level: 2 })).toBeVisible();
  await expect(page.locator('.showcase-facts')).toBeVisible();
  await expect(page.locator('[data-project-purpose]')).toHaveCount(0);
  await expect(page.locator('[data-project-highlights]')).toHaveCount(0);
  await expect(page.locator('[data-project-stack]')).toHaveCount(0);
});

test('richer project page reflows at 320px and preserves touch-sized primary action', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/project/the-bible-challenge/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  const action = page.locator('[data-record-primary-actions] .structural-button').first();
  const box = await action.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  await expect(page.getByRole('heading', { name: 'Project snapshot', level: 2 })).toBeVisible();
});
