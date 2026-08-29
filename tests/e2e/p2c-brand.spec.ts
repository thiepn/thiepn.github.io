import { expect, test } from '@playwright/test';

const pngDimensions = (body: Buffer) => {
  expect(body.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return { width: body.readUInt32BE(16), height: body.readUInt32BE(20) };
};

test('header exposes the canonical Page Pixel mark and lowercase wordmark', async ({ page }) => {
  await page.goto('/');
  const brand = page.locator('[data-site-brand]');
  const mark = brand.locator('[data-brand-mark]');
  await expect(brand).toBeVisible();
  await expect(brand).toHaveAttribute('href', '/');
  await expect(mark).toBeVisible();
  await expect(mark).toHaveAttribute('viewBox', '0 0 64 64');
  await expect(brand.locator('.site-wordmark')).toHaveText('thiepn');
  await expect(mark).toHaveAttribute('aria-hidden', 'true');
});

test('document head exposes the complete THIEPN icon contract', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('meta[name="application-name"]')).toHaveAttribute('content', 'THIEPN');
  await expect(page.locator('meta[name="apple-mobile-web-app-title"]')).toHaveAttribute('content', 'THIEPN');
  await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute('href', '/favicon.svg');
  await expect(page.locator('link[rel="icon"][type="image/png"]')).toHaveAttribute('href', '/favicon-32x32.png');
  await expect(page.locator('link[rel="icon"][type="image/png"]')).toHaveAttribute('sizes', '32x32');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/apple-touch-icon.png');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('sizes', '180x180');
  await expect(page.locator('link[rel="mask-icon"]')).toHaveAttribute('href', '/mask-icon.svg');
  await expect(page.locator('link[rel="mask-icon"]')).toHaveAttribute('color', '#0F1725');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
});

test('manifest and PNG assets expose exact install icon dimensions', async ({ request }) => {
  const manifestResponse = await request.get('/manifest.webmanifest');
  expect(manifestResponse.ok()).toBeTruthy();
  const manifest = await manifestResponse.json();
  expect(manifest.name).toBe('THIEPN Project Universe');
  expect(manifest.short_name).toBe('THIEPN');
  expect(manifest.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }),
    expect.objectContaining({ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }),
  ]));

  const assets = [
    ['/favicon-32x32.png', 32],
    ['/apple-touch-icon.png', 180],
    ['/icon-192.png', 192],
    ['/icon-512.png', 512],
  ] as const;

  for (const [path, size] of assets) {
    const response = await request.get(path);
    expect(response.ok(), path).toBeTruthy();
    expect(response.headers()['content-type'], path).toContain('image/png');
    expect(pngDimensions(await response.body()), path).toEqual({ width: size, height: size });
  }
});

test('brand mark remains legible in light and dark themes', async ({ page }) => {
  await page.goto('/');
  const mark = page.locator('[data-site-brand] [data-brand-mark]');

  await page.evaluate(() => localStorage.setItem('thiepn:index-theme', 'light'));
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const lightColor = await mark.evaluate((node) => getComputedStyle(node).color);
  expect(lightColor).not.toBe('rgba(0, 0, 0, 0)');

  await page.evaluate(() => localStorage.setItem('thiepn:index-theme', 'dark'));
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const darkColor = await mark.evaluate((node) => getComputedStyle(node).color);
  expect(darkColor).not.toBe('rgba(0, 0, 0, 0)');
  expect(darkColor).not.toBe(lightColor);
});

test('brand identity stays compact and overflow-free at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  const brand = page.locator('[data-site-brand]');
  await expect(brand).toBeVisible();
  await expect(brand.locator('[data-brand-mark]')).toBeVisible();
  await expect(brand.locator('.site-wordmark')).toHaveText('thiepn');
  await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
  const headerHeight = await page.locator('.site-header').evaluate((node) => node.getBoundingClientRect().height);
  expect(headerHeight).toBeLessThanOrEqual(64);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
