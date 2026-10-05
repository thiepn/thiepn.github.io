import { test, expect } from '@playwright/test';
import { HUB_DISABLED_FEATURES, validateHubReleaseStatus } from '../../src/lib/hub-release-policy';
test('H8 built public profile stays gated despite a stale local identity', async ({ page }) => {
  const privateRequests: string[] = [];
  page.on('request', request => { if (/supabase\.co|account\.thiepn\.dev|\/hub\/transfer/.test(request.url())) privateRequests.push(new URL(request.url()).origin); });
  await page.addInitScript(() => localStorage.setItem('thiepn:hub-auth:v1', JSON.stringify({ access_token: 'fictional-expired-token', user: { id: '11111111-1111-4111-8111-111111111111', email: 'fictional@example.test' } })));
  const response = await page.request.get('/hub-release.json'); expect(response.status()).toBe(200);
  const status = validateHubReleaseStatus(await response.json());
  for (const feature of HUB_DISABLED_FEATURES) expect(status.features[feature]).toBe(feature === 'privateReads' && status.profile === 'device-reading-pilot');
  await page.goto('/home/');
  await expect(page.locator('[data-auth-status]')).toHaveText('Hub sign-in is not enabled yet.');
  await expect(page.locator('[data-auth-login]')).toBeHidden();
  await expect(page.locator('[data-auth-logout]')).toBeHidden();
  await expect(page.locator('[data-hub-item]')).toHaveCount(status.appCount);
  await expect(page.getByRole('link', { name: 'Open Account', exact: true })).toHaveAttribute('href', 'https://account.thiepn.dev/');
  await page.goto('/inbox/'); await expect(page.getByText('Inbox is not connected yet', { exact: true })).toBeVisible();
  await expect(page.locator('[data-inbox-items]')).toBeEmpty();
  expect(privateRequests).toEqual([]);
});
