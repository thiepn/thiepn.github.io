import { test, expect } from '@playwright/test';

test('desktop catalogue keeps useful app information without ornamental labels', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/apps/');
  await expect(page.locator('#ws-title')).toHaveText('Apps');
  await expect(page.locator('.ws-search-trigger')).toContainText('Search');
  await expect(page.locator('.hub-card').first()).toBeVisible();
  await expect(page.locator('.hub-card__body > p').first()).toBeVisible();
  await expect(page.locator('.hub-kicker, .ws-visitor-number')).toHaveCount(0);
  const bodySize = await page.locator('.hub-card__body > p').first()
    .evaluate(el => Number.parseFloat(getComputedStyle(el).fontSize));
  const metaSize = await page.locator('.hub-card__meta').first()
    .evaluate(el => Number.parseFloat(getComputedStyle(el).fontSize));
  expect(bodySize).toBeGreaterThanOrEqual(14);
  expect(metaSize).toBeGreaterThanOrEqual(14);
});

test('mobile navigation and app details remain readable without numbered filler', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/apps/');
  await expect(page.locator('.ws-mobile-nav')).toBeVisible();
  await expect(page.locator('#ws-more-title')).toHaveText('More');
  await expect(page.locator('.hub-card').first()).toBeVisible();
  await expect(page.locator('.ws-visitor-number')).toHaveCount(0);
  const actionSize = await page.locator('.hub-card__actions a').first()
    .evaluate(el => Number.parseFloat(getComputedStyle(el).fontSize));
  expect(actionSize).toBeGreaterThanOrEqual(14);
});

test('inbox retains its total without duplicating main navigation', async ({ page }) => {
  await page.goto('/inbox/');
  await expect(page.locator('[data-inbox-total]')).toHaveCount(1);
  await expect(page.locator('.portal-inbox-footer a')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Workspace attention' })).toBeVisible();
});

test('public work and project pages use content headings instead of taglines', async ({ page }) => {
  await page.goto('/work/');
  await expect(page.getByRole('heading', { name: 'Selected work', exact: true })).toBeVisible();
  await expect(page.getByText('Made to be used.', { exact: true })).toHaveCount(0);
  await page.goto('/projects/');
  await expect(page.getByRole('heading', { name: 'Project archive.', exact: true })).toBeVisible();
  await expect(page.getByText('Portfolio archive', { exact: true })).toHaveCount(0);
});

test('project snapshots preserve facts without duplicate category headings', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/project/the-bible-challenge/');
  await expect(page.getByRole('heading', { name: 'Project snapshot' })).toBeVisible();
  await expect(page.getByText('At a glance', { exact: true })).toHaveCount(0);
  await expect(page.locator('.showcase-facts dt').first()).toBeVisible();
  const metaFont = await page.locator('.showcase-facts dt').first()
    .evaluate(node => Number.parseFloat(getComputedStyle(node).fontSize));
  expect(metaFont).toBeGreaterThanOrEqual(14);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
    .toBeLessThanOrEqual(1);
});

test('Byte desktop keeps actionable downloads and security instructions without slogans', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/byte/');
  await expect(page.getByRole('heading', { name: 'Byte', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Download Byte' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /unknown-publisher warning/i })).toBeVisible();
  await expect(page.locator('.closing-cta, .visual-note')).toHaveCount(0);
  await expect(page.locator('a[href="#download"]').first()).toBeVisible();
  await testInfo.attach('byte-desktop.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});

test('Byte mobile reflows and retains primary download actions', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/byte/');
  await expect(page.getByRole('heading', { name: 'Byte', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'FAQ', exact: true })).toBeVisible();
  const action = page.getByRole('link', { name: 'Download for Windows', exact: true });
  await expect(action).toBeVisible();
  expect((await action.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await testInfo.attach('byte-mobile.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});

test('mobile Today and catalogue retain content without decorative labels', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.ws-mobile-nav')).toBeVisible();
  await expect(page.locator('#ws-title')).toBeVisible();
  await expect(page.locator('.ws-visitor-number')).toHaveCount(0);
  await testInfo.attach('hub-today-mobile.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  await page.goto('/apps/');
  await expect(page.locator('.hub-card').first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await testInfo.attach('hub-apps-mobile.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});
