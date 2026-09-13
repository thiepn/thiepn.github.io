import { expect, test, type Page, type Route } from '@playwright/test';

const SUPABASE_ORIGIN = 'https://hycegznamzjhwinegaai.supabase.co';
const SESSION_KEY = 'sb-hycegznamzjhwinegaai-auth-token';
const USER_ID = '11111111-1111-4111-8111-111111111111';

const user = {
  id: USER_ID,
  email: 'platform@example.test',
  email_confirmed_at: '2026-09-01T10:00:00.000Z',
  created_at: '2026-08-01T10:00:00.000Z',
  last_sign_in_at: '2026-09-12T20:00:00.000Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { full_name: 'Platform User' },
  identities: [{ provider: 'email' }],
  factors: [],
};

const session = {
  access_token: 'platform-access-token',
  refresh_token: 'platform-refresh-token',
  expires_at: 2_000_000_000,
  token_type: 'bearer',
  user,
};

const ecosystem = [
  {
    app_slug: 'notes', name: 'Notes', description: 'Local-first notes.', path: '/notes/', sort_order: 10,
    manifest_version: 1, identity_scope: 'shared', data_scope: 'isolated', export_scope: 'app-owned',
    capabilities: { sharedIdentity: true, isolatedData: true, activityTracking: true, ecosystemDeletion: true, platformExport: 'metadata-only' },
    connected: true, first_used_at: '2026-09-01T10:00:00.000Z', last_used_at: '2026-09-12T20:00:00.000Z',
  },
  {
    app_slug: 'diet', name: 'Diet Copilot', description: 'Nutrition tracking.', path: '/diet/', sort_order: 20,
    manifest_version: 1, identity_scope: 'shared', data_scope: 'isolated', export_scope: 'app-owned',
    capabilities: { sharedIdentity: true, isolatedData: true, activityTracking: true, ecosystemDeletion: true, platformExport: 'metadata-only' },
    connected: false, first_used_at: null, last_used_at: null,
  },
  {
    app_slug: 'wordstrike', name: 'WORDSTRIKE', description: 'Typing training.', path: '/wordstrike/', sort_order: 30,
    manifest_version: 1, identity_scope: 'shared', data_scope: 'isolated', export_scope: 'app-owned',
    capabilities: { sharedIdentity: true, isolatedData: true, activityTracking: true, ecosystemDeletion: true, platformExport: 'metadata-only' },
    connected: true, first_used_at: '2026-08-01T10:00:00.000Z', last_used_at: '2026-09-11T20:00:00.000Z',
  },
];

const snapshot = {
  schema: 'thiepn-platform-snapshot',
  version: 1,
  platformVersion: '1.0.0',
  exportedAt: '2026-09-13T00:00:00Z',
  account: { userId: USER_ID, email: user.email },
  profile: {
    displayName: 'Platform User',
    preferredLanguage: 'en',
    timezone: 'Europe/Berlin',
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-12T20:00:00.000Z',
  },
  security: { assuranceLevel: 'aal1' },
  apps: ecosystem.map((app) => ({
    slug: app.app_slug,
    name: app.name,
    path: app.path,
    manifestVersion: app.manifest_version,
    identityScope: app.identity_scope,
    dataScope: app.data_scope,
    exportScope: app.export_scope,
    capabilities: app.capabilities,
    connected: app.connected,
    firstUsedAt: app.first_used_at,
    lastUsedAt: app.last_used_at,
  })),
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

async function installPlatformApi(page: Page) {
  await page.addInitScript(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: SESSION_KEY, value: session },
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
    if (url.pathname === '/auth/v1/user') return fulfillJson(route, user);
    if (url.pathname === '/rest/v1/account_profiles') {
      return fulfillJson(route, [{
        user_id: USER_ID,
        display_name: 'Platform User',
        preferred_language: 'en',
        timezone: 'Europe/Berlin',
        created_at: '2026-09-01T10:00:00.000Z',
        updated_at: '2026-09-12T20:00:00.000Z',
      }]);
    }
    if (url.pathname === '/rest/v1/account_apps') {
      return fulfillJson(route, ecosystem.map((app) => ({
        slug: app.app_slug,
        name: app.name,
        description: app.description,
        path: app.path,
        sort_order: app.sort_order,
      })));
    }
    if (url.pathname === '/rest/v1/account_user_apps') {
      return fulfillJson(route, ecosystem.filter((app) => app.connected).map((app) => ({
        app_slug: app.app_slug,
        first_used_at: app.first_used_at,
        last_used_at: app.last_used_at,
      })));
    }
    if (url.pathname === '/rest/v1/rpc/list_thiepn_account_sessions') {
      return fulfillJson(route, [{
        session_id: 'session-platform',
        created_at: '2026-09-12T19:00:00.000Z',
        updated_at: '2026-09-12T20:00:00.000Z',
        refreshed_at: null,
        not_after: null,
        user_agent: 'Mozilla/5.0 Chrome/149.0 Windows',
        aal: 'aal1',
        is_current: true,
      }]);
    }
    if (url.pathname === '/rest/v1/rpc/get_thiepn_ecosystem') return fulfillJson(route, ecosystem);
    if (url.pathname === '/rest/v1/rpc/export_thiepn_platform_snapshot') return fulfillJson(route, snapshot);
    throw new Error(`Unexpected A4 platform request: ${request.method()} ${url.pathname}`);
  });
}

test.describe('A4 Ecosystem Platform', () => {
  test('renders the versioned registry and preserves explicit identity/data boundaries', async ({ page }) => {
    await installPlatformApi(page);
    await page.goto('/account/');

    await expect(page.getByRole('heading', { name: 'One identity, explicit app boundaries.' })).toBeVisible();
    await expect(page.locator('.account-platform-version')).toHaveText('Platform v1.0.0');
    await expect(page.locator('[data-a4-app-count]')).toHaveText('3');
    await expect(page.locator('[data-a4-connected-count]')).toHaveText('2');
    await expect(page.locator('[data-a4-platform-apps] > li')).toHaveCount(3);
    await expect(page.locator('[data-a4-platform-apps]')).toContainText('manifest v1 · data isolated');
    await expect(page.locator('[data-a4-platform-apps] [data-connected="true"]')).toHaveCount(2);
  });

  test('exports only the metadata snapshot contract as JSON', async ({ page }) => {
    await installPlatformApi(page);
    await page.goto('/account/');
    await expect(page.locator('[data-a4-app-count]')).toHaveText('3');

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export JSON' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^thiepn-account-platform-\d{4}-\d{2}-\d{2}\.json$/);

    const path = await download.path();
    expect(path).not.toBeNull();
    const fs = await import('node:fs/promises');
    const body = JSON.parse(await fs.readFile(path!, 'utf8'));
    expect(body).toMatchObject({
      schema: 'thiepn-platform-snapshot',
      version: 1,
      platformVersion: '1.0.0',
      account: { userId: USER_ID, email: user.email },
      security: { assuranceLevel: 'aal1' },
    });
    expect(body.apps).toHaveLength(3);
    expect(body).not.toHaveProperty('notes');
    expect(body).not.toHaveProperty('diet');
    expect(body).not.toHaveProperty('wordstrike');
    expect(JSON.stringify(body)).not.toContain('calorie_target');
    expect(JSON.stringify(body)).not.toContain('leaderboard_submissions');
    expect(JSON.stringify(body)).not.toContain('notes_sync_records');
    await expect(page.locator('[data-a4-platform-status]')).toContainText('App-owned content was not included.');
  });

  test('keeps the signed-in platform surface within a 320px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await installPlatformApi(page);
    await page.goto('/account/');
    await expect(page.locator('[data-a4-app-count]')).toHaveText('3');

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
