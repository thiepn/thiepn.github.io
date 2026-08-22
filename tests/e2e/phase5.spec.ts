import { test, expect } from '@playwright/test';

test('homepage initializes restrained hero motion without the decorative Living Index field', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-index-hero]')).toHaveAttribute('data-hero-motion', 'active');
  await expect(page.locator('[data-living-index]')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Projects, tools & experiments.' })).toBeVisible();
});

test('homepage exposes a dense project directory instead of duplicating the full archive controls', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-project-directory] .project-directory__item')).toHaveCount(19);
  await expect(page.locator('[data-project-directory] [data-archive-query]')).toHaveCount(0);
  await expect(page.locator('[data-project-directory]').getByRole('link', { name: /Filter & search/ })).toHaveAttribute('href', '/projects/');
});

test('reduced motion keeps the portfolio hero static', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4321/');
  await expect(page.locator('[data-index-hero]')).toHaveAttribute('data-hero-motion', 'static');
  await context.close();
});

test('portfolio sections reveal once and preserve direct navigation to the dedicated archive', async ({ page }) => {
  await page.goto('/');
  const featured = page.locator('#featured');
  await featured.scrollIntoViewIfNeeded();
  await expect(featured).toHaveAttribute('data-motion-revealed', 'true');
  const directory = page.locator('#projects');
  await directory.scrollIntoViewIfNeeded();
  await expect(directory).toHaveAttribute('data-motion-revealed', 'true');
  await expect(page.getByRole('link', { name: 'Browse all projects' })).toHaveAttribute('href', '/projects/');
});

test('touch-sized homepage stays inside the viewport and keeps project navigation usable', async ({ browser, browserName }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, ...(browserName === 'firefox' ? {} : { isMobile: true }) });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4321/');
  await expect(page.locator('[data-living-index]')).toHaveCount(0);
  await expect(page.locator('.featured-card').first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.locator('.project-directory__item').first()).toBeVisible();
  await context.close();
});
