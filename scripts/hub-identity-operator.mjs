// Local, human-operated real-provider qualification. Never run in CI.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { createInterface } from 'node:readline/promises';
import { chromium, firefox, webkit } from '@playwright/test';

const hub = 'https://thiepn.dev', account = 'https://account.thiepn.dev';
const issuer = 'https://hycegznamzjhwinegaai.supabase.co';
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
if (!args.includes('--real-auth') || process.env.CI || !process.stdin.isTTY) {
  console.error('Run locally in an interactive terminal with --real-auth. Google sign-in is performed by the operator in a fresh headed browser.');
  process.exit(1);
}
const dist = await fs.realpath(option('--dist', 'dist'));
const output = path.resolve(option('--output', '.cache/h10-identity-observation.json'));
const engine = option('--browser', 'chromium');
if (!['chromium', 'firefox', 'webkit'].includes(engine)) throw new Error('Unsupported browser');
const release = JSON.parse(await fs.readFile(path.join(dist, 'hub-release.json'), 'utf8'));
if (release.features?.hubSignIn !== true || ['privateReads','inlineWrites','inboxReads','automatedTransfers'].some(key => release.features?.[key] !== false)) {
  throw new Error('Use an isolated identity-enabled build with all private features disabled. Do not upload this build to Pages.');
}
const providers = JSON.parse(await fs.readFile(path.join(dist, 'hub-providers.json'), 'utf8'));
if (providers.providers.some(provider => provider.transport !== null || provider.privateReadsEnabled || provider.inlineWritesEnabled)) throw new Error('Private providers must remain disabled');
const files = ['hub-release.json', 'hub-providers.json', 'home/index.html', 'home/auth/callback/index.html'];
async function assets(dir) {
  for (const entry of await fs.readdir(path.join(dist, dir), { withFileTypes: true })) {
    if (entry.isSymbolicLink()) throw new Error('Candidate assets may not contain symlinks');
    const relative = path.posix.join(dir, entry.name);
    if (entry.isDirectory()) await assets(relative); else files.push(relative);
  }
}
await assets('_astro');
const hashes = [];
const candidateBytes = new Map();
let realKey = false;
for (const file of files.sort()) {
  const bytes = await fs.readFile(path.join(dist, file));
  if (file.endsWith('.js')) {
    const keys = bytes.toString().match(/sb_publishable_[A-Za-z0-9_-]+/g) ?? [];
    if (keys.some(key => /fixture|not_a_real_key/i.test(key))) throw new Error('Fictional provider build cannot qualify real authentication');
    realKey ||= keys.length > 0;
  }
  hashes.push({ file, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
  candidateBytes.set(file, bytes);
}
if (!realKey) throw new Error('Candidate must contain the canonical project publishable key');
const mime = file => file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.json') ? 'application/json' : file.endsWith('.html') ? 'text/html' : file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.woff2') ? 'font/woff2' : 'application/octet-stream';
const observations = { codeExchange: 0, refresh: 0, verifiedUser: 0, localLogout: 0, privateRequestsBlocked: 0 };
const checks = {};
const terminal = createInterface({ input: process.stdin, output: process.stdout });
const browser = await ({ chromium, firefox, webkit })[engine].launch({ headless: false });
const context = await browser.newContext(); // No existing sessions, TLS bypass, trace, HAR or screenshots.
let accountRevision = null, finished = false;
try {
  const response = await context.request.get(account + '/release.json', { timeout: 8000 });
  if (!response.ok()) throw new Error('Account release metadata unavailable');
  const metadata = await response.json();
  accountRevision = metadata.commit;
  if (!/^[0-9a-f]{40}$/.test(accountRevision ?? '')) throw new Error('Account release revision missing');
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === issuer && /^\/(rest|functions|storage)\/v1(?:\/|$)/.test(url.pathname)) {
      observations.privateRequestsBlocked++; return route.abort();
    }
    if (url.origin !== hub) return route.continue();
    // Hub exists only in this browser. Real Account, Google and Auth remain live.
    if (request.method() !== 'GET') return route.abort();
    let file = path.resolve(dist, '.' + decodeURIComponent(url.pathname));
    try {
      if ((await fs.stat(file)).isDirectory()) file = path.join(file, 'index.html');
      file = await fs.realpath(file);
      if (!file.startsWith(dist + path.sep)) return route.abort();
      return route.fulfill({ body: candidateBytes.get(path.relative(dist, file).split(path.sep).join('/')) ?? await fs.readFile(file), contentType: mime(file) });
    } catch { return route.fulfill({ status: 404, body: 'Candidate route unavailable' }); }
  });
  context.on('response', response => {
    // Persist counters only. Never persist URLs, headers, bodies, codes or identities.
    const url = new URL(response.url());
    if (url.origin !== issuer || !response.ok()) return;
    if (url.pathname === '/auth/v1/token') {
      if (url.searchParams.get('grant_type') === 'pkce') observations.codeExchange++;
      if (url.searchParams.get('grant_type') === 'refresh_token') observations.refresh++;
    }
    if (url.pathname === '/auth/v1/user') observations.verifiedUser++;
    if (url.pathname === '/auth/v1/logout' && url.searchParams.get('scope') === 'local') observations.localLogout++;
  });
  const page = await context.newPage();
  const signedIn = async () => page.url() === hub + '/home/' && await page.locator('[data-auth-switch]').isVisible();
  // UUIDs exist only in process memory for equality checks; never in the report.
  const subject = () => page.evaluate(() => JSON.parse(localStorage.getItem('thiepn:hub-auth:v1') ?? 'null')?.user?.id ?? null);
  await page.goto(hub + '/home/');
  console.log('This browser serves your local Hub candidate at its canonical origin. Production is unchanged. Complete Google yourself; no credential automation is used. Close the browser to abort.');
  await terminal.question('Sign in from Hub through Account and Google. Once Home shows your signed-in state, press Enter. ');
  const first = await subject();
  checks.googleRoundTrip = !!first && await signedIn() && observations.codeExchange > 0 && observations.verifiedUser > 0;
  if (!checks.googleRoundTrip) throw new Error('Google round trip was not observed');
  await page.reload();
  await page.locator('[data-auth-switch]').waitFor({ state: 'visible', timeout: 15000 });
  checks.reloadSameIdentity = await subject() === first;
  await terminal.question('Use Switch account, then Return to Hub without continuing Google. Once signed out, press Enter. ');
  checks.cancelSwitchClearsIdentity = page.url() === hub + '/home/' && await page.locator('[data-auth-login]').isVisible() && await subject() === null;
  await terminal.question('Sign in again with a different authorized test account. Once Home is signed in, press Enter. ');
  const second = await subject();
  checks.switchDifferentIdentity = !!second && second !== first && await signedIn();
  const beforeRefresh = observations.refresh, beforeVerification = observations.verifiedUser;
  await terminal.question('Leave Home open until a natural refresh occurs (normally up to one hour). Press Enter when ready; skipping leaves refresh unqualified. ');
  checks.naturalRefresh = observations.refresh > beforeRefresh && observations.verifiedUser > beforeVerification && await signedIn() && await subject() === second;
  const other = await context.newPage(); await other.goto(hub + '/home/');
  await other.locator('[data-auth-switch]').waitFor({ state: 'visible', timeout: 15000 });
  await terminal.question('Use Sign out of Hub in the original tab. Once both tabs show Sign in, press Enter. ');
  checks.localAndCrossTabSignOut = await page.locator('[data-auth-login]').isVisible() && await other.locator('[data-auth-login]').isVisible() && observations.localLogout > 0;
  finished = true;
  if (Object.values(checks).some(value => value !== true) || observations.privateRequestsBlocked > 0) process.exitCode = 1;
} catch {
  // Browser/SDK errors can include provider URLs. Do not serialize them.
  console.error('Qualification stopped before completion. The report remains incomplete; no provider error detail or URL was retained.');
  process.exitCode = 1;
} finally {
  terminal.close(); await context.close(); await browser.close();
  const report = {
    schemaVersion: 1, profile: 'H10-local-identity-observation', recordedAt: new Date().toISOString(),
    browser: { engine, version: browser.version() }, accountRevision, candidateAssets: hashes,
    finished, observedChecksPassed: finished && Object.values(checks).every(value => value === true) && observations.privateRequestsBlocked === 0, checks, observations,
    productionCertified: false,
    remaining: ['Authoritative exact callback allowlist review', 'Preference isolation review', 'Account session independence review', 'Cross-device revocation with documented JWT expiry behavior', 'Physical Android/iPad checks', 'Deployed candidate fingerprint comparison'],
    scope: 'Human-operated local candidate with real providers; no production enablement or private authorization certification',
  };
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  console.log('Redacted observation report written. Production certification remains pending.');
}
