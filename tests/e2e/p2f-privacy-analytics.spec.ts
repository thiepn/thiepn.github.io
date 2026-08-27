import { expect, test } from '@playwright/test';

test('privacy page documents the analytics boundary and is publicly discoverable', async ({ page, request }) => {
  await page.goto('/privacy/');
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy' })).toBeVisible();
  await expect(page.locator('[data-analytics-status="not-configured"]')).toBeVisible();
  await expect(page.getByText('No Cloudflare Web Analytics beacon is emitted by this deployment.')).toBeVisible();
  await expect(page.getByText('Global Privacy Control')).toBeVisible();
  await expect(page.getByText('Do Not Track')).toBeVisible();

  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBeTruthy();
  expect(await sitemap.text()).toContain('https://thiepn.dev/privacy/');
});

test('analytics fails closed without deployment configuration', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'strict-origin');
  await expect(page.locator('[data-privacy-analytics-loader]')).toHaveCount(0);
  await expect(page.locator('script[src*="cloudflareinsights.com"]')).toHaveCount(0);
});

test('privacy is linked from the global footer', async ({ page }) => {
  await page.goto('/projects/');
  await expect(page.locator('footer').getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy/');
});
