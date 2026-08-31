import { expect, test } from '@playwright/test';
import { SITE } from '../../src/data/site';

test('homepage inherits canonical portfolio metadata and visible identity', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(SITE.title);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', SITE.description);
  await expect(page.getByText('Independent digital portfolio', { exact: true })).toBeVisible();
  await expect(page.locator('.universe-hero__intro')).toContainText('books');
  await expect(page.getByText('Five ways to explore the portfolio', { exact: true })).toBeVisible();

  const body = await page.locator('body').innerText();
  expect(body).not.toContain('THIEPN universe');
  expect(body).not.toContain('Independent project universe');
});
