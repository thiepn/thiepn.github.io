import { test, expect } from '@playwright/test';

const releaseApi = 'https://api.github.com/repos/thiepn/scan/releases/tags/v1.0.0';

test('Scan product page uses authentic Android media', async ({ page }) => {
  await page.route(releaseApi, (route) => route.fulfill({ status: 404, body: '{}' }));
  await page.goto('/scan/');

  await expect(page.getByRole('heading', { name: 'This is the app—not a concept render.' })).toBeVisible();
  await expect(page.locator('.scan-shot')).toHaveCount(9);
  await expect(page.locator('.scan-real-badge')).toHaveText('REAL APP · API 35');

  const screenshotSources = await page.locator('.scan-shot__image img').evaluateAll((images) =>
    images.map((image) => (image as HTMLImageElement).getAttribute('src')),
  );
  expect(screenshotSources).toEqual([
    '/scan/screenshots/01-library.webp',
    '/scan/screenshots/02-scan-modes.webp',
    '/scan/screenshots/03-sort-filter.webp',
    '/scan/screenshots/04-automation-center.webp',
    '/scan/screenshots/05-document-view.webp',
    '/scan/screenshots/06-export-pdf.webp',
    '/scan/screenshots/07-document-search.webp',
    '/scan/screenshots/08-markup-redaction.webp',
    '/scan/screenshots/09-form-filling.webp',
  ]);

  for (const image of await page.locator('.scan-shot__image img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect(image).toHaveJSProperty('complete', true);
    expect(await image.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBeGreaterThan(1000);
  }
});

test('Scan download experience fails closed before v1.0.0 is published', async ({ page }) => {
  await page.route(releaseApi, (route) => route.fulfill({ status: 404, body: '{}' }));
  await page.goto('/scan/');

  await expect(page.locator('[data-scan-release-status]')).toHaveText('v1.0.0 release candidate');
  await expect(page.locator('[data-scan-release-pending]').first()).toBeVisible();
  await expect(page.locator('[data-scan-release-download]').first()).toBeHidden();
  await expect(page.locator('[data-scan-apk-size]')).toHaveText('Pending');
  await expect(page.locator('[data-scan-checksum]')).toHaveText('Pending');
});

test('Scan download experience unlocks only official release assets', async ({ page }) => {
  const checksum = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const apkUrl = 'https://downloads.example/Scan-v1.0.0.apk';
  const aabUrl = 'https://downloads.example/Scan-v1.0.0.aab';
  const checksumsUrl = 'https://downloads.example/release-checksums.sha256';

  await page.route(releaseApi, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      tag_name: 'v1.0.0',
      draft: false,
      prerelease: false,
      html_url: 'https://github.com/thiepn/scan/releases/tag/v1.0.0',
      published_at: '2026-09-28T18:00:00Z',
      assets: [
        { name: 'Scan-v1.0.0.apk', browser_download_url: apkUrl, size: 21 * 1024 * 1024 },
        { name: 'Scan-v1.0.0.aab', browser_download_url: aabUrl, size: 20 * 1024 * 1024 },
        { name: 'release-checksums.sha256', browser_download_url: checksumsUrl, size: 256 },
      ],
    }),
  }));
  await page.route(checksumsUrl, (route) => route.fulfill({
    status: 200,
    contentType: 'text/plain',
    body: `${checksum}  Scan-v1.0.0.apk\n`,
  }));

  await page.goto('/scan/');

  await expect(page.locator('[data-scan-release-status]')).toHaveText('Scan v1.0.0');
  await expect(page.locator('[data-scan-release-download]').first()).toBeVisible();
  await expect(page.locator('[data-scan-release-download]').first()).toHaveAttribute('href', apkUrl);
  await expect(page.locator('[data-scan-aab-download]')).toHaveAttribute('href', aabUrl);
  await expect(page.locator('[data-scan-checksums-download]')).toHaveAttribute('href', checksumsUrl);
  await expect(page.locator('[data-scan-apk-size]')).toHaveText('21.0 MB');
  await expect(page.locator('[data-scan-checksum]')).toHaveAttribute('title', checksum);
  await expect(page.locator('[data-copy-checksum]')).toBeVisible();
  await expect(page.locator('[data-scan-release-panel]')).toHaveClass(/is-published/);
});

test('Scan mobile gallery stays horizontally contained', async ({ page }) => {
  await page.route(releaseApi, (route) => route.fulfill({ status: 404, body: '{}' }));
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/scan/');

  await expect(page.locator('.scan-gallery')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);

  const first = await page.locator('.scan-shot').first().boundingBox();
  expect(first).not.toBeNull();
  expect(first!.width).toBeGreaterThan(250);
  expect(first!.width).toBeLessThan(375);
});
