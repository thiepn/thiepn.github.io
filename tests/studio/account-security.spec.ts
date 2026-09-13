import { Buffer } from 'node:buffer';
import { expect, test, type Page, type Route } from '@playwright/test';

const SUPABASE_ORIGIN = 'https://hycegznamzjhwinegaai.supabase.co';
const SESSION_KEY = 'sb-hycegznamzjhwinegaai-auth-token';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const FACTOR_ID = '22222222-2222-4222-8222-222222222222';
const CHALLENGE_ID = '33333333-3333-4333-8333-333333333333';
const SESSION_ID = '44444444-4444-4444-8444-444444444444';

function jwt(payload: Record<string, unknown>) {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
}

const userWithoutMfa = {
  id: USER_ID,
  email: 'account@example.test',
  email_confirmed_at: '2026-09-01T10:00:00.000Z',
  created_at: '2026-08-01T10:00:00.000Z',
  last_sign_in_at: '2026-09-12T20:00:00.000Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { full_name: 'Test User' },
  identities: [{ provider: 'email' }],
  factors: [],
};

const userWithMfa = {
  ...userWithoutMfa,
  factors: [{
    id: FACTOR_ID,
    friendly_name: 'Test authenticator',
    factor_type: 'totp',
    status: 'verified',
    created_at: '2026-09-12T18:00:00.000Z',
  }],
};

const ecosystem = [
  {
    app_slug: 'notes', name: 'Notes', description: 'Local-first notes.', path: '/notes/', sort_order: 10,
    manifest_version: 1, identity_scope: 'shared', data_scope: 'isolated', export_scope: 'app-owned',
    capabilities: { sharedIdentity: true, isolatedData: true }, connected: false, first_used_at: null, last_used_at: null,
  },
  {
    app_slug: 'diet', name: 'Diet Copilot', description: 'Nutrition tracking.', path: '/diet/', sort_order: 20,
    manifest_version: 1, identity_scope: 'shared', data_scope: 'isolated', export_scope: 'app-owned',
    capabilities: { sharedIdentity: true, isolatedData: true }, connected: false, first_used_at: null, last_used_at: null,
  },
  {
    app_slug: 'wordstrike', name: 'WORDSTRIKE', description: 'Typing training.', path: '/wordstrike/', sort_order: 30,
    manifest_version: 1, identity_scope: 'shared', data_scope: 'isolated', export_scope: 'app-owned',
    capabilities: { sharedIdentity: true, isolatedData: true }, connected: false, first_used_at: null, last_used_at: null,
  },
];

function authSession(user: typeof userWithoutMfa | typeof userWithMfa, aal: 'aal1' | 'aal2') {
  return {
    access_token: jwt({ aal, session_id: SESSION_ID, exp: 2_000_000_000, amr: [{ method: aal === 'aal2' ? 'totp' : 'password', timestamp: 1_999_999_900 }] }),
    refresh_token: `refresh-${aal}`,
    expires_at: 2_000_000_000,
    token_type: 'bearer',
    user,
  };
}

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

async function installApi(page: Page, options: { user: typeof userWithoutMfa | typeof userWithMfa; initialSession?: ReturnType<typeof authSession> }) {
  const { user, initialSession } = options;
  if (initialSession) {
    await page.addInitScript(
      ({ key, value }) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(value));
      },
      { key: SESSION_KEY, value: initialSession },
    );
  }

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
      await fulfillJson(route, user);
      return;
    }
    if (url.pathname === '/auth/v1/otp') {
      expect(JSON.parse(request.postData() ?? '{}')).toMatchObject({ email: 'account@example.test', create_user: false });
      await fulfillJson(route, {});
      return;
    }
    if (url.pathname === '/auth/v1/verify' && request.method() === 'POST') {
      expect(JSON.parse(request.postData() ?? '{}')).toMatchObject({ email: 'account@example.test', token: '123456', type: 'email' });
      await fulfillJson(route, authSession(userWithoutMfa, 'aal1'));
      return;
    }
    if (url.pathname === `/auth/v1/factors/${FACTOR_ID}/challenge`) {
      await fulfillJson(route, { id: CHALLENGE_ID, expires_at: 2_000_000_000 });
      return;
    }
    if (url.pathname === `/auth/v1/factors/${FACTOR_ID}/verify`) {
      expect(JSON.parse(request.postData() ?? '{}')).toEqual({ challenge_id: CHALLENGE_ID, code: '654321' });
      await fulfillJson(route, authSession(userWithMfa, 'aal2'));
      return;
    }
    if (url.pathname === '/rest/v1/account_profiles') {
      await fulfillJson(route, [{
        user_id: USER_ID,
        display_name: 'Test User',
        preferred_language: 'en',
        timezone: 'Europe/Berlin',
        created_at: '2026-09-01T10:00:00.000Z',
        updated_at: '2026-09-12T20:00:00.000Z',
      }]);
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
      await fulfillJson(route, []);
      return;
    }
    if (url.pathname === '/rest/v1/rpc/list_thiepn_account_sessions') {
      await fulfillJson(route, [{
        session_id: SESSION_ID,
        created_at: '2026-09-12T19:00:00.000Z',
        updated_at: '2026-09-12T20:00:00.000Z',
        refreshed_at: null,
        not_after: null,
        user_agent: 'Mozilla/5.0 Firefox/155.0 Windows',
        aal: user.factors.length ? 'aal2' : 'aal1',
        is_current: true,
      }]);
      return;
    }
    if (url.pathname === '/rest/v1/rpc/get_thiepn_ecosystem') {
      await fulfillJson(route, ecosystem);
      return;
    }

    throw new Error(`Unexpected account request in A3/A4 test: ${request.method()} ${url.pathname}`);
  });
}

test.describe('A3 Security & Recovery', () => {
  test('signs an existing account in through the email OTP fallback', async ({ page }) => {
    await installApi(page, { user: userWithoutMfa });
    await page.goto('/account/');

    await page.locator('[data-auth-email]').fill('account@example.test');
    await page.getByRole('button', { name: 'Send sign-in email' }).click();
    await expect(page.locator('[data-a3-email-otp-verify]')).toBeVisible();
    await page.getByLabel('Email sign-in code').fill('123456');
    await page.getByRole('button', { name: 'Verify code' }).click();

    await expect(page.locator('[data-account-signed-in]')).toBeVisible();
    await expect(page.locator('[data-account-email]')).toHaveText('account@example.test');
    const stored = await page.evaluate((key) => localStorage.getItem(key), SESSION_KEY);
    expect(stored).toContain('refresh-aal1');
  });

  test('gates an MFA account at AAL1 and upgrades it to AAL2 before showing account controls', async ({ page }) => {
    await installApi(page, { user: userWithMfa, initialSession: authSession(userWithMfa, 'aal1') });
    await page.goto('/account/');

    await expect(page.locator('[data-account-mfa-gate]')).toBeVisible();
    await expect(page.locator('[data-account-signed-in]')).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Verify your second factor.' })).toBeVisible();

    await page.getByRole('button', { name: 'Start verification' }).click();
    await page.getByLabel('Authenticator code').fill('654321');
    await page.getByRole('button', { name: 'Verify', exact: true }).click();

    await expect(page.locator('[data-account-mfa-gate]')).toBeHidden();
    await expect(page.locator('[data-account-signed-in]')).toBeVisible();
    await expect(page.locator('[data-a3-mfa-badge]')).toHaveText('Protected · AAL2');
    const stored = await page.evaluate((key) => localStorage.getItem(key), SESSION_KEY);
    expect(stored).toContain('refresh-aal2');
  });
});
