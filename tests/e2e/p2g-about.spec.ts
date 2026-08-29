import { expect, test } from '@playwright/test';

test('About page explains the portfolio and exposes the public contact channel', async ({ page }) => {
  await page.goto('/about/');
  await expect(page.getByRole('heading', { level: 1, name: 'I build useful things.' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'How I work.' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Want to discuss a project?' })).toBeVisible();

  const aboutNav = page.locator('.site-nav a[href="/about/"]');
  await expect(aboutNav).toHaveAttribute('aria-current', 'page');

  const github = page.locator('#contact a[href="https://github.com/thiepn"]');
  await expect(github).toBeVisible();
  await expect(page.locator('.site-footer__nav a[href="/about/"]')).toBeVisible();
});

test('About is a sitemap route and remains usable in mobile navigation', async ({ page, request }) => {
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBeTruthy();
  expect(await sitemap.text()).toContain('https://thiepn.dev/about/');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/about/');
  const menu = page.getByRole('button', { name: 'Menu' });
  await expect(menu).toBeVisible();
  await menu.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('.mobile-menu__wordmark')).toHaveText('thiepn');
  await expect(dialog.locator('a[href="/about/"]')).toHaveAttribute('aria-current', 'page');

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
