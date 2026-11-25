import { test, expect, type Page, type Request } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { validateHubReleaseStatus } from '../../src/lib/hub-release-policy';
import { HUB_VISIBLE_APP_IDS } from '../../src/lib/workspace/visible-apps';

const issuer = 'https://hycegznamzjhwinegaai.supabase.co';
const account = 'https://account.thiepn.dev';
const registry = JSON.parse(readFileSync('src/generated/launch-manifest.json', 'utf8')).entries as { id: string }[];
const visibleIds = [...HUB_VISIBLE_APP_IDS];

// Fresh browser contexts only. No real credentials, private app reads or OAuth continuation.
// Account's first-party discovery iframe may perform exactly this anonymous,
// read-only registration lookup. The Account SQL contract grants it to anon;
// no user token, private record read or write is allowed by this exception.
const hubClientId = 'a4c1fca4-d8d1-410d-908c-7462db6e60df';
async function isAnonymousRegistrationProbe(r: Request): Promise<boolean> {
  try {
    if (r.url() !== issuer + '/rest/v1/rpc/resolve_thiepn_first_party_sso_probe' || r.method() !== 'POST') return false;
    const frame = r.frame();
    const location = new URL(frame.url());
    if (location.origin !== account || location.pathname !== '/sso/probe' ||
        location.search !== '?client_id=' + hubClientId || location.hash ||
        !frame.parentFrame() || new URL(frame.parentFrame()!.url()).origin !== 'https://thiepn.dev') return false;
    const body = r.postDataJSON();
    if (!body || Object.keys(body).length !== 1 || body.p_client_id !== hubClientId) return false;
    const headers = await r.allHeaders();
    const key = headers.apikey ?? '';
    // The publishable key or legacy anonymous JWT is not an authenticated user token.
    let publicKey = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
    if (!publicKey) {
      const parts = key.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8'));
        publicKey = payload.role === 'anon' && !payload.sub;
      }
    }
    return publicKey && (!headers.authorization || headers.authorization === 'Bearer ' + key) && !headers.cookie;
  } catch {
    return false;
  }
}
async function publicProbe(page: Page) {
  const privateRequests: string[] = []; const errors: string[] = [];
  const checks: Promise<void>[] = [];
  page.on('request', r => {
    if (/\/auth\/v1|\/rest\/v1|\/functions\/v1|\/hub\/(summary|search|inbox|transfer)/.test(r.url())) {
      checks.push(isAnonymousRegistrationProbe(r).then(allowed => {
        if (!allowed) privateRequests.push(new URL(r.url()).pathname);
      }));
    }
  });
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  return async () => { await Promise.all(checks); expect(privateRequests).toEqual([]); expect(errors).toEqual([]); };
}

test('live release registry and exact ordered visible app catalogue', async ({ page, request }) => {
  const finish = await publicProbe(page);
  const response = await request.get('/hub-release.json'); expect(response.ok()).toBe(true);
  const release = validateHubReleaseStatus(await response.json());
  expect(release.profile).toBe('account-sync');
  expect(release.releaseId).toBe('H24-account-sync-v1');
  expect(release.features).toEqual({ hubSignIn: true, privateReads: true, inlineWrites: false, inboxReads: false, automatedTransfers: false });
  // Registered launch contracts are not the visible presentation roster.
  expect(release.appCount).toBe(registry.length);
  expect(visibleIds).toHaveLength(14);
  expect(new Set(visibleIds).size).toBe(14);
  expect(visibleIds.every(id => registry.some(app => app.id === id))).toBe(true);
  const search = await request.get('/hub-search.json'); expect(search.ok()).toBe(true);
  const searchProjects = (await search.json()).projects as { slug: string }[];
  expect(searchProjects).toHaveLength(registry.length);
  expect(new Set(searchProjects.map(project => project.slug))).toEqual(new Set(registry.map(app => app.id)));
  await page.goto('/apps/');
  const cards = page.locator('[data-hub-item]');
  await expect(cards).toHaveCount(14);
  expect(await cards.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-hub-slug')))).toEqual(visibleIds);
  for (const card of await cards.all()) {
    await expect(card).toBeVisible();
    await expect(card.getByRole('link', { name: 'Open app', exact: false })).toBeVisible();
  }
  await finish();
});

test('live local customization persists only approved shortcuts', async ({ page }) => {
  const finish = await publicProbe(page);
  await page.goto('/');
  await expect(page.locator('[data-auth-login]')).toBeHidden();
  await expect(page.locator('[data-hub-item]')).toHaveCount(0);
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  const shortcuts = page.locator('[data-widget-type=app-shortcuts] [data-launch]');
  const getIds = () => shortcuts.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-launch')));
  const original = await getIds();
  expect(original.length).toBeGreaterThan(1);
  expect(original.every(id => visibleIds.includes(id as typeof visibleIds[number]))).toBe(true);
  await page.locator('[data-widget-type=app-shortcuts] header [data-action=configure-widget]').click();
  const choices = page.locator('input[name=appIds]');
  await expect(choices).toHaveCount(14);
  expect(await choices.evaluateAll(nodes => nodes.map(node => (node as HTMLInputElement).value))).toEqual(visibleIds);
  const checked = page.locator('input[name=appIds]:checked').first();
  const removed = await checked.inputValue();
  expect(original).toContain(removed);
  await checked.uncheck();
  await page.locator('[data-dialog-submit]').click();
  // The dedicated shortcut dialog saves directly, without opening layout edit mode.
  await expect(page.locator('[data-workspace-dialog]')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Customize', exact: true })).toBeVisible();
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  const expected = original.filter(id => id !== removed);
  await expect.poll(getIds).toEqual(expected);
  await page.reload();
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  await expect.poll(getIds).toEqual(expected);
  await finish();
});

test('live Search respects visible apps and private-resource boundaries', async ({ page }) => {
  test.setTimeout(60_000); // Multiple real production navigations, including Firefox.
  const finish = await publicProbe(page);
  await page.goto('/search/?q=merge+PDF');
  await expect(page.locator('[data-portal-search-slug]:visible').first()).toHaveAttribute('data-portal-search-slug', 'pdf-studio');
  await page.getByRole('tab', { name: 'My resources', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Connected search', exact: true })).toBeVisible();
  await expect(page.locator('[data-portal-search-status]')).toHaveText('No connected sources.');
  await expect(page.locator('[data-portal-query]')).toBeHidden();
  // The public query is retained in memory when switching tabs, but never
  // appears in the resources URL or triggers private requests. A direct load
  // of the resources URL starts with an empty public query.
  await expect(page).toHaveURL(/\/search\/\?scope=resources$/);
  await expect(page.locator('[data-portal-search-slug]:visible')).toHaveCount(0);
  await expect(page.locator('[data-portal-query]')).toHaveValue('merge PDF');
  await page.reload();
  await expect(page.locator('[data-portal-query]')).toBeHidden();
  await expect(page.locator('[data-portal-query]')).toHaveValue('');
  await expect(page.locator('[data-portal-search-status]')).toHaveText('No connected sources.');
  const allApps = await page.goto('/search/', { waitUntil: 'domcontentloaded' });
  expect(allApps?.ok()).toBe(true);
  await expect(page.locator('[data-search-scopes]')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('tab', { name: 'Apps', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-portal-search-status]')).toHaveText('14 apps', { timeout: 15_000 });
  const rows = page.locator('[data-portal-search-slug]:visible');
  await expect(rows).toHaveCount(14, { timeout: 15_000 });
  expect(new Set(await rows.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-portal-search-slug'))))).toEqual(new Set(visibleIds));
  await finish();
});

test('live manual workflow handoffs exclude hidden apps and claim no transfer', async ({ page }) => {
  const finish = await publicProbe(page);
  await page.goto('/flows/?flow=pdf-read&step=2');
  await expect(page.locator('[aria-current="step"] h3')).toHaveText('Choose the reading copy');
  await expect(page.locator('[data-flow-status]')).toContainText('no file transfer or app outcome confirmed');
  await expect(page.locator('[data-flow-guide="scan-read"]')).toHaveCount(0);
  const links = page.locator('[data-flow-guide="pdf-read"] .portal-flow-actions a[target="_blank"]');
  expect(await links.evaluateAll(nodes => nodes.map(node => (node as HTMLAnchorElement).href))).toEqual(['https://thiepn.dev/pdf/', 'https://thiepn.dev/library/saved/']);
  await expect(links.first()).toHaveAttribute('rel', 'noopener noreferrer');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await finish();
});

test('live Account validates tokenless entry and rejects alternate destinations', async ({ page, request }) => {
  const release = await request.get(account + '/release.json'); expect(release.ok()).toBe(true);
  const metadata = await release.json(); expect(metadata.product).toBe('THIEPN Account');
  if (process.env.H9_ACCOUNT_SHA) expect(metadata.commit).toBe(process.env.H9_ACCOUNT_SHA);
  // Abort auth navigation defensively; this probe never clicks Continue with Google.
  await page.route(issuer + '/**', route => route.abort());
  const launch = new URL(issuer + '/auth/v1/authorize');
  launch.searchParams.set('provider', 'google'); launch.searchParams.set('prompt', 'select_account');
  launch.searchParams.set('code_challenge_method', 's256'); launch.searchParams.set('code_challenge', 'a'.repeat(43));
  launch.searchParams.set('redirect_to', 'https://thiepn.dev/home/auth/callback/?flow=' + 'b'.repeat(64));
  const entry = account + '/hub/entry?request=' + encodeURIComponent(launch.href);
  await page.goto(entry);
  await expect(page.getByRole('heading', { name: 'Sign in to THIEPN Hub', exact: true })).toBeVisible();
  await expect(page).toHaveURL(account + '/hub/entry');
  await expect(page.getByRole('link', { name: 'Continue with Google', exact: true })).toHaveAttribute('href', launch.href);
  await expect(page.getByRole('link', { name: 'Return to Hub', exact: true })).toHaveAttribute('href', 'https://thiepn.dev/home/');
  launch.searchParams.set('redirect_to', 'https://attacker.invalid/');
  await page.goto(account + '/hub/entry?request=' + encodeURIComponent(launch.href));
  await expect(page.getByRole('heading', { name: 'This Hub sign-in request is invalid.', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Continue with Google', exact: true })).toHaveCount(0);
  await page.goto(entry + '&extra=1');
  await expect(page.getByRole('heading', { name: 'This Hub sign-in request is invalid.', exact: true })).toBeVisible();
});
