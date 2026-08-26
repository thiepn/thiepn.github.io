import { expect, test } from '@playwright/test';

test('public project endpoint exposes the listed portfolio', async ({ request }) => {
  const response = await request.get('/catalogue.json');
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data.identity).toBe('THIEPN PROJECTS');
  expect(Array.isArray(data.projects)).toBeTruthy();
  expect(data.projects.length).toBeGreaterThan(0);
  expect(data.projects.some((project: { code: string }) => project.code === 'T-001')).toBeTruthy();
});

test('sitemap includes public projects and excludes dev diagnostics', async ({ request }) => {
  const response = await request.get('/sitemap.xml');
  expect(response.ok()).toBeTruthy();
  const xml = await response.text();
  expect(xml).toContain('/project/pdf-studio/');
  expect(xml).toContain('/collection/browser-games/');
  expect(xml).not.toContain('/dev/');
});

test('catalogue diagnostics are noindex and render the ledger', async ({ page }) => {
  await page.goto('/dev/catalogue/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('CATALOGUE');
  await expect(page.getByText('T-001', { exact: true }).first()).toBeVisible();
});

test('design-system diagnostics are noindex', async ({ page }) => {
  await page.goto('/dev/design-system/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
  await expect(page.locator('h1')).toBeVisible();
});

test('project pages expose generated raster OG artwork', async ({ page }) => {
  await page.goto('/project/pdf-studio/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/pdf-studio\.png$/);
  await expect(page.locator('meta[property="og:image:type"]')).toHaveAttribute('content', 'image/png');
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200');
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', '630');
});
