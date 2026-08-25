import { expect, test } from '@playwright/test';

test('renders catalogue-derived Project Universe counts', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/THIEPN/);
  await expect(page.getByRole('heading', { level: 1, name: 'THIEPN' })).toBeVisible();

  const catalogueResponse = await page.request.get('/catalogue.json');
  expect(catalogueResponse.ok()).toBe(true);
  const catalogue = await catalogueResponse.json();
  const projects = catalogue.projects ?? catalogue;

  const stats = page.locator('.universe-hero__stat');
  await expect(stats).toHaveCount(4);
  await expect(stats.locator('span')).toHaveText(['Projects', 'Books', 'Featured', 'Collections']);
  await expect(stats.locator('strong').nth(0)).toHaveText(String(projects.length).padStart(2, '0'));

  const bookStat = (await stats.locator('strong').nth(1).textContent())?.trim();
  const featuredCount = await page.locator('#featured article').count();
  const collectionCount = await page.locator('.collection-ribbon > a').count();
  await expect(stats.locator('strong').nth(2)).toHaveText(String(featuredCount).padStart(2, '0'));
  await expect(stats.locator('strong').nth(3)).toHaveText(String(collectionCount).padStart(2, '0'));

  await page.goto('/books/');
  const bookCount = await page.locator('[data-book-record]').count();
  expect(bookStat).toBe(String(bookCount).padStart(2, '0'));
});

test('generates public project routes but not hold records', async ({ page }) => {
  const publicResponse = await page.goto('/project/pdf-studio/');
  expect(publicResponse?.ok()).toBe(true);
  await expect(page.getByRole('heading', { name: 'PDF Studio' })).toBeVisible();

  const holdResponse = await page.goto('/project/markdown-guide/');
  expect(holdResponse?.status()).toBe(404);
});

test('P1F released products are first-class public projects', async ({ page }) => {
  const expected = [
    ['/project/pflegelern/', 'PflegeLern'],
    ['/project/thiepn-library/', 'THIEPN Library'],
  ] as const;

  for (const [route, title] of expected) {
    const response = await page.goto(route);
    expect(response?.ok()).toBe(true);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  }
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