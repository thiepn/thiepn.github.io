import { expect, test } from '@playwright/test';

test('renders catalogue-derived portfolio hub counts', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/THIEPN/);
  await expect(page.getByRole('heading', { name: /Projects, tools & experiments\./ })).toBeVisible();
  await expect(page.locator('.portfolio-hero__stats strong')).toHaveText(['19', '05', '05']);
});

test('generates public project routes but not hold records', async ({ page }) => {
  const publicResponse = await page.goto('/project/pdf-studio/');
  expect(publicResponse?.ok()).toBe(true);
  await expect(page.getByRole('heading', { name: 'PDF Studio' })).toBeVisible();

  const holdResponse = await page.goto('/project/markdown-guide/');
  expect(holdResponse?.status()).toBe(404);
});

test('generates collection routes from collection records', async ({ page }) => {
  const response = await page.goto('/collection/french-learning/');
  expect(response?.ok()).toBe(true);
  await expect(page.getByRole('heading', { name: 'French Learning' })).toBeVisible();
  const directory = page.locator('.collection-record__index');
  await expect(directory.getByRole('link', { name: 'French 3000', exact: true })).toBeVisible();
});

test('theme preference persists', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('320px viewport does not create page-level horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

test('unknown routes use normal portfolio navigation', async ({ page }) => {
  const response = await page.goto('/definitely-not-indexed/');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: "This page doesn't exist." })).toBeVisible();
  await expect(page.getByRole('link', { name: /Go home/ })).toBeVisible();
});
