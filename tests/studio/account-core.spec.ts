import { expect, test, type Page, type Route } from '@playwright/test';

const SUPABASE_ORIGIN = 'https://hycegznamzjhwinegaai.supabase.co';
const SESSION_KEY = 'sb-hycegznamzjhwinegaai-auth-token';

const mockUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'account@example.test',
  email_confirmed_at: '2026-09-01T10:00:00.000Z',
  created_at: '2026-08-01T10:00:00.000Z',
  last_sign_in_at: '2026-09-12T20:00:00.000Z',
  user_metadata: { full_name: 'Test User' },
  identities: [{ provider: 'google' }],
};

const mockSession = {
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_at: 2_000_000_000,
  token_type: 'bearer',
  user: mockUser,
};

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization,apikey,content-type,prefer',
      'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    },
    body: JSON.stringify(body),
  });
}

async function installMockAccountApi(page: Page) {
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: SESSION_KEY, value: mockSession },
  );

  await page.route(`${SUPABASE_ORIGIN}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': 'authorization,apikey,content-type,prefer',
          'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
        },
      });
      return;
    }

    if (url.pathname === '/auth/v1/user') {
      await fulfillJson(route, mockUser);
      return;
    }
    if (url.pathname === '/rest/v1/account_profiles') {
      await fulfillJson(route, [
        {
          user_id: mockUser.id,
          display_name: 'Test User',
          preferred_language: 'en',
          timezone: 'Europe/Berlin',
          created_at: '2026-09-01T10:00:00.000Z',
          updated_at: '2026-09-12T20:00:00.000Z',
        },
      ]);
      return;
    }
    if (url.pathname === '/rest/v1/account_apps') {
      await fulfillJson(route, [
        { slug: 'notes', name: 'Notes', description: 'Local-first notes.', path: '/notes/', sort_order: 10 },
        { slug: 'diet', name: 'Diet Copilot', description: 'Nutrition tracking.', path: '/diet/', sort_order: 20 },
        { slug: 'wordstrike', name: 'WORDSTRIKE', description: 'Typing training.', path: '/wordstrike/', sort_order: 30 },
      ]);
      return;
    }
    if (url.pathname === '/rest/v1/account_user_apps') {
      await fulfillJson(route, [
        { app_slug: 'diet', first_used_at: '2026-09-01T10:00:00.000Z', last_used_at: '2026-09-12T20:00:00.000Z' },
        { app_slug: 'wordstrike', first_used_at: '2026-08-01T10:00:00.000Z', last_used_at: '2026-09-11T20:00:00.000Z' },
      ]);
      return;
    }
    if (url.pathname === '/storage/v1/object/list/notes-attachments') {
      await fulfillJson(route, []);
      return;
    }
    if (url.pathname === '/rest/v1/rpc/delete_thiepn_account') {
      await fulfillJson(route, { deleted: true, reason: null });
      return;
    }

    throw new Error(`Unexpected THIEPN Account request in test: ${request.method()} ${url.pathname}`);
  });
}

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

  test('renders a restored shared account and its app boundaries', async ({ page }) => {
    await installMockAccountApi(page);
    await page.goto('/account/');

    await expect(page.locator('[data-account-signed-out]')).toBeHidden();
    await expect(page.locator('[data-account-signed-in]')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Test User' })).toBeVisible();
    await expect(page.locator('[data-account-email]')).toHaveText('account@example.test');
    await expect(page.locator('[data-security-google]')).toHaveText('Connected');
    await expect(page.locator('[data-security-email-verified]')).toHaveText('Verified');
    await expect(page.locator('.account-app')).toHaveCount(3);
    await expect(page.locator('.account-app[data-connected="true"]')).toHaveCount(2);
    await expect(page.getByRole('heading', { name: 'Shared identity does not mean shared content.' })).toBeVisible();
  });

  test('keeps ecosystem deletion disabled until the exact confirmation and then uses the guarded RPC', async ({ page }) => {
    await installMockAccountApi(page);
    await page.goto('/account/');

    const deleteButton = page.getByRole('button', { name: 'Delete THIEPN Account' });
    const confirmation = page.getByLabel(/Type DELETE MY ACCOUNT to confirm/);
    await expect(deleteButton).toBeDisabled();

    await confirmation.fill('DELETE MY ACCOUN');
    await expect(deleteButton).toBeDisabled();
    await confirmation.fill('DELETE MY ACCOUNT');
    await expect(deleteButton).toBeEnabled();
    await deleteButton.click();

    await expect(page.locator('[data-account-signed-in]')).toBeHidden();
    await expect(page.locator('[data-account-deleted]')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'The identity is gone.' })).toBeVisible();
    await expect(page.locator('[data-delete-result]')).toContainText('Account and connected app data deleted.');
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
