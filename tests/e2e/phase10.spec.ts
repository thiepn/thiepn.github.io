import { expect, test } from '@playwright/test';

test('public catalogue endpoint exposes the listed index', async ({ request }) => {
  const response = await request.get('/catalogue.json');
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data.identity).toBe('THE INDEX');
  expect(data.projects).toHaveLength(19);
  expect(data.projects.some((project: { code: string }) => project.code === 'T-001')).toBeTruthy();
});

test('sitemap includes public records and excludes dev diagnostics', async ({ request }) => {
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
  await expect(page.getByText('T-001', { exact: true })).toBeVisible();
});

test('design-system diagnostics are noindex', async ({ page }) => {
  await page.goto('/dev/design-system/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('THE INDEX');
});

test('artifact records expose generated OG artwork', async ({ page }) => {
  await page.goto('/project/pdf-studio/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/pdf-studio\.svg$/);
});
