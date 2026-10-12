import { test, expect } from '@playwright/test';
import { HUB_DISABLED_FEATURES, validateHubReleaseStatus } from '../../src/lib/hub-release-policy';

test('built Hub profile rejects stale local identity without opening private Library data', async ({ page }) => {
  const privateReads: string[] = [];
  const issuer = 'https://hycegznamzjhwinegaai.supabase.co';

  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname.includes('/library/hub/bridge')
      || url.pathname.includes('/rest/v1/library_sync_state')
      || url.pathname.includes('/hub/transfer')
      || url.origin === 'https://account.thiepn.dev') {
      privateReads.push(url.href);
    }
  });

  await page.route(`${issuer}/**`, route => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'Fixture rejects stale identity' }),
  }));

  await page.addInitScript(() => localStorage.setItem('thiepn:hub-auth:v1', JSON.stringify({
    access_token: 'fictional-expired-token',
    refresh_token: 'fictional-expired-refresh',
    token_type: 'bearer',
    expires_in: 1,
    expires_at: 1,
    user: {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'fictional@example.test',
    },
  })));

  const response = await page.request.get('/hub-release.json');
  expect(response.status()).toBe(200);
  const status = validateHubReleaseStatus(await response.json());

  for (const feature of HUB_DISABLED_FEATURES) {
    const expected = status.profile === 'library-ecosystem'
      ? feature === 'hubSignIn' || feature === 'privateReads'
      : feature === 'privateReads' && status.profile === 'device-reading-pilot';
    expect(status.features[feature]).toBe(expected);
  }

  await page.goto('/home/');
  await expect(page.locator('[data-auth-logout]')).toBeHidden();
  await expect(page.locator('[data-private-library]')).toBeHidden();
  await expect(page.locator('[data-hub-item]')).toHaveCount(status.appCount);
  await expect(page.getByRole('link', { name: 'Open Account', exact: true })).toHaveAttribute('href', 'https://account.thiepn.dev/');

  await page.goto('/inbox/');
  await expect(page.getByText('Inbox is not connected yet', { exact: true })).toBeVisible();
  await expect(page.locator('[data-inbox-items]')).toBeEmpty();

  expect(privateReads).toEqual([]);
});
