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
const probeUrl = issuer + '/rest/v1/rpc/resolve_thiepn_first_party_sso_probe';
function isPublicCredential(key: string): boolean {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;
  try {
    const parts = key.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(Buffer.from(parts[1]!, 'base64url').toString('utf8'));
    return payload.role === 'anon' && !payload.sub;
  } catch { return false; }
}
// Capture the initiating frame synchronously before Account can remove it.
// A missing Origin in Playwright's request metadata is not equivalent to an
// incorrect Origin. Only exact, independently verified iframe provenance can
// substitute for a missing header; explicit foreign or opaque origins fail.
function fromHubDiscoveryFrame(r: Request, page: Page): boolean {
  try {
    const frame = r.frame();
    const url = new URL(frame.url());
    const parent = frame.parentFrame();
    return parent === page.mainFrame() && new URL(parent.url()).origin === 'https://thiepn.dev' &&
      url.origin === account && url.pathname === '/sso/probe' &&
      url.search === '?client_id=' + hubClientId && !url.hash;
  } catch { return false; }
}
async function registrationProbeViolation(r: Request, verifiedFrame: boolean): Promise<string | null> {
  try {
    if (r.url() !== probeUrl) return 'unexpected endpoint';
    const headers = { ...r.headers(), ...await r.allHeaders() };
    if (headers.origin !== undefined && headers.origin !== account) return 'unexpected explicit origin';
    if (headers.origin === undefined && !verifiedFrame) return 'missing origin without verified probe frame';
    if (headers.cookie !== undefined && headers.cookie !== '') return 'cookie present';
    if (r.method() === 'OPTIONS') {
      if (headers.authorization || headers.apikey ||
          headers['access-control-request-method']?.toUpperCase() !== 'POST' || r.postData()) return 'invalid preflight';
      return null;
    }
    if (r.method() !== 'POST') return 'unexpected method';
    const body = r.postDataJSON();
    if (!body || Object.keys(body).length !== 1 || body.p_client_id !== hubClientId) return 'unexpected request body';
    if (!isPublicCredential(headers.apikey ?? '')) return 'non-public API key';
    const authorization = headers.authorization;
    if (authorization && (!authorization.startsWith('Bearer ') || !isPublicCredential(authorization.slice(7)))) return 'non-anonymous authorization';
    return null;
  } catch { return 'request metadata unavailable'; }
}
async function publicProbe(page: Page) {
  const privateRequests: string[] = []; const errors: string[] = [];
  const checks: Promise<void>[] = [];
  page.on('request', r => {
    if (/\/auth\/v1|\/rest\/v1|\/functions\/v1|\/hub\/(summary|search|inbox|transfer)/.test(r.url())) {
      const verifiedFrame = fromHubDiscoveryFrame(r, page);
      checks.push(registrationProbeViolation(r, verifiedFrame).then(reason => {
        if (reason) privateRequests.push(new URL(r.url()).pathname + ' (' + reason + ')');
      }));
    }
  });
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  return async () => {
    // Include checks registered while earlier asynchronous header reads settle.
    let checked = 0;
    while (checked < checks.length) { const batch = checks.slice(checked); checked += batch.length; await Promise.all(batch); }
    expect(privateRequests).toEqual([]); expect(errors).toEqual([]);
  };
}

test('live release registry and exact ordered visible app catalogue', async ({ page, request }) => {
  const timeline = searchNavigationTimeline(page);
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
  await settleGuestDiscovery(page, timeline, 0);
  await finish();
});

test('live local customization persists only approved shortcuts', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const timeline = searchNavigationTimeline(page);
  const finish = await publicProbe(page);
  try {
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
    await settleGuestDiscovery(page, timeline, 0);
    const beforeReload = timeline.probeStarts();
    timeline.record('shortcut-reload');
    const reload = await page.reload({ waitUntil: 'commit', timeout: 15_000 });
    expect(reload?.ok()).toBe(true);
    await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
    await expect.poll(getIds).toEqual(expected);
    await settleGuestDiscovery(page, timeline, beforeReload);
    await finish();
    timeline.record('all-assertions-passed');
  } finally {
    await testInfo.attach('shortcut-navigation-timeline', { body: timeline.snapshot(), contentType: 'application/json' });
  }
});

// Record only public route paths and lifecycle metadata: no URL queries,
// request bodies, headers, cookies, credentials or application records.
function searchNavigationTimeline(page: Page) {
  const started = Date.now();
  const events: Record<string, unknown>[] = [];
  const record = (kind: string, detail: Record<string, unknown> = {}) => {
    if (events.length < 800) events.push({ ms: Date.now() - started, kind, ...detail });
  };
  const safeUrl = (raw: string) => {
    try { const url = new URL(raw); return url.origin + url.pathname; }
    catch { return '(non-HTTP document)'; }
  };
  const requestDetails = (request: Request) => {
    let frame = 'unknown';
    try { frame = request.frame() === page.mainFrame() ? 'main' : 'child'; } catch {}
    return { url: safeUrl(request.url()), method: request.method(), resourceType: request.resourceType(), navigation: request.isNavigationRequest(), frame };
  };
  page.on('request', request => record('request', requestDetails(request)));
  page.on('response', response => record('response', { ...requestDetails(response.request()), status: response.status(), fromServiceWorker: response.fromServiceWorker() }));
  page.on('requestfinished', request => record('requestfinished', requestDetails(request)));
  page.on('requestfailed', request => record('requestfailed', requestDetails(request)));
  page.on('framenavigated', frame => record('framenavigated', { frame: frame === page.mainFrame() ? 'main' : 'child', url: safeUrl(frame.url()) }));
  page.on('domcontentloaded', () => record('domcontentloaded', { url: safeUrl(page.url()) }));
  page.on('load', () => record('load', { url: safeUrl(page.url()) }));
  page.on('pageerror', () => record('pageerror'));
  page.on('crash', () => record('crash'));
  return {
    record,
    probeStarts: () => events.filter(event => event.kind === 'request' && event.frame === 'child' && event.navigation === true && event.url === account + '/sso/probe').length,
    snapshot: () => JSON.stringify({ finalPath: safeUrl(page.url()), events }, null, 2),
  };
}

// Account discovery is asynchronous and guest-first. In the captured Firefox
// failure the old cross-origin probe was cancelled during the final navigation,
// although the new document returned 200 and emitted both lifecycle events.
// Complete the already-expected cold guest discovery before another document
// transition. Neither the browser's SSO nor its service worker is disabled.
async function settleGuestDiscovery(page: Page, timeline: ReturnType<typeof searchNavigationTimeline>, previousStarts: number) {
  await expect.poll(timeline.probeStarts, { timeout: 12_000, message: 'Cold guest Account discovery has started' }).toBeGreaterThan(previousStarts);
  await expect(page.locator('iframe[src*="/sso/probe"]')).toHaveCount(0, { timeout: 12_000 });
  timeline.record('guest-discovery-settled');
}

test('live Search respects visible apps and private-resource boundaries', async ({ page }, testInfo) => {
  test.setTimeout(75_000); // Keep individual navigation deadlines bounded and reserve time for diagnostics.
  const timeline = searchNavigationTimeline(page);
  const finish = await publicProbe(page);
  try {
    timeline.record('initial-query-navigation');
    const initial = await page.goto('/search/?q=merge+PDF', { waitUntil: 'commit', timeout: 15_000 });
    expect(initial?.ok()).toBe(true);
    await expect(page.locator('[data-search-scopes]')).toBeVisible({ timeout: 15_000 });
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
    await settleGuestDiscovery(page, timeline, 0);
    const beforeReload = timeline.probeStarts();
    timeline.record('resource-reload');
    const reload = await page.reload({ waitUntil: 'commit', timeout: 15_000 });
    expect(reload?.ok()).toBe(true);
    await expect(page.locator('[data-search-scopes]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-portal-query]')).toBeHidden();
    await expect(page.locator('[data-portal-query]')).toHaveValue('');
    await expect(page.locator('[data-portal-search-status]')).toHaveText('No connected sources.');
    await settleGuestDiscovery(page, timeline, beforeReload);
    const beforeFinal = timeline.probeStarts();
    timeline.record('final-direct-navigation', await page.evaluate(() => ({ readyState: document.readyState, serviceWorkerControlled: Boolean(navigator.serviceWorker?.controller) })));
    // Do not wait for an unrelated lifecycle event or subframe. Require actual
    // document commitment, HTTP success and the initialized application below.
    const allApps = await page.goto('/search/', { waitUntil: 'commit', timeout: 15_000 });
    timeline.record('final-document-committed');
    expect(allApps?.ok()).toBe(true);
    expect(allApps?.url()).toBe('https://thiepn.dev/search/');
    await expect.poll(() => page.url(), { timeout: 5_000 }).toBe('https://thiepn.dev/search/');
    await expect(page.locator('[data-search-scopes]')).toBeVisible({ timeout: 15_000 });
    expect(await page.evaluate(() => location.href)).toBe('https://thiepn.dev/search/');
    await expect(page.getByRole('tab', { name: 'Apps', exact: true })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[data-portal-search-status]')).toHaveText('14 apps', { timeout: 15_000 });
    const rows = page.locator('[data-portal-search-slug]:visible');
    await expect(rows).toHaveCount(14, { timeout: 15_000 });
    expect(new Set(await rows.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-portal-search-slug'))))).toEqual(new Set(visibleIds));
    await settleGuestDiscovery(page, timeline, beforeFinal);
    await finish();
    timeline.record('all-assertions-passed');
  } finally {
    await testInfo.attach('search-navigation-timeline', { body: timeline.snapshot(), contentType: 'application/json' });
  }
});

test('live manual workflow handoffs exclude hidden apps and claim no transfer', async ({ page }) => {
  const timeline = searchNavigationTimeline(page);
  const finish = await publicProbe(page);
  await page.goto('/flows/?flow=pdf-read&step=2');
  await expect(page.locator('[aria-current="step"] h3')).toHaveText('Choose the reading copy');
  await expect(page.locator('[data-flow-status]')).toContainText('no file transfer or app outcome confirmed');
  await expect(page.locator('[data-flow-guide="scan-read"]')).toHaveCount(0);
  const links = page.locator('[data-flow-guide="pdf-read"] .portal-flow-actions a[target="_blank"]');
  expect(await links.evaluateAll(nodes => nodes.map(node => (node as HTMLAnchorElement).href))).toEqual(['https://thiepn.dev/pdf/', 'https://thiepn.dev/library/saved/']);
  await expect(links.first()).toHaveAttribute('rel', 'noopener noreferrer');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await settleGuestDiscovery(page, timeline, 0);
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
