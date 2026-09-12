import { expect, test } from '@playwright/test';

test.describe('A1 THIEPN Account core', () => {
  test('renders the private signed-out account shell', async ({ page }) => {
    await page.goto('/account/');

    await expect(page).toHaveTitle('THIEPN Account');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('One account.');
    await expect(page.getByRole('heading', { name: 'Sign in once.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.locator('[data-account-signed-in]')).toBeHidden();
    await expect(page.locator('[data-account-deleted]')).toBeHidden();
  });

  test('keeps the account dashboard responsive without page-level overflow', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/account/');
    await expect(page.getByRole('heading', { name: 'Sign in once.' })).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('surfaces account navigation from the site footer', async ({ page }) => {
    await page.goto('/');
    const accountLink = page.getByRole('contentinfo').getByRole('link', { name: 'Account' });
    await expect(accountLink).toHaveAttribute('href', '/account/');
  });
});
