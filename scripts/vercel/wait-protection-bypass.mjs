const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @param {{
 *   url?: string,
 *   secret?: string,
 *   fetchImpl?: typeof fetch,
 *   sleepImpl?: (ms: number) => Promise<void>,
 *   attempts?: number,
 *   intervalMs?: number,
 * }} [options]
 */
export async function waitForProtectionBypass({
  url,
  secret,
  fetchImpl = fetch,
  sleepImpl = sleep,
  attempts = 20,
  intervalMs = 250,
} = {}) {
  if (!url) throw new Error('Deployment URL is required');
  const base = new URL(url);
  if (
    base.protocol !== 'https:' ||
    base.username ||
    base.password ||
    base.pathname !== '/' ||
    base.search ||
    base.hash ||
    !base.hostname.endsWith('.vercel.app')
  ) {
    throw new Error('Use a clean Vercel deployment origin');
  }
  if (!/^[A-Za-z0-9]{32}$/.test(secret ?? '')) {
    throw new Error('VERCEL_AUTOMATION_BYPASS_SECRET is invalid');
  }
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 60) {
    throw new Error('attempts is invalid');
  }
  if (!Number.isInteger(intervalMs) || intervalMs < 25 || intervalMs > 5000) {
    throw new Error('intervalMs is invalid');
  }

  const probe = new URL('/hub-release.json', base);
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(probe, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(5000),
        headers: {
          'x-vercel-protection-bypass': secret,
          'Cache-Control': 'no-cache',
          'user-agent': 'THIEPN-Vercel-Bypass-Wait/1',
        },
      });
      if (response.status === 200) {
        await response.body?.cancel().catch(() => {});
        return attempt;
      }
      await response.body?.cancel().catch(() => {});
    } catch {
      // Retry only within the bounded activation window.
    }
    if (attempt < attempts) await sleepImpl(intervalMs);
  }
  throw new Error('Vercel automation bypass did not become active in time');
}

function arg(name) {
  const index = process.argv.indexOf('--' + name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const url = arg('url') ?? process.env.VERCEL_DEPLOYMENT_URL;
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const attempt = await waitForProtectionBypass({ url, secret });
  console.log('Vercel automation bypass active after probe attempt ' + attempt + '.');
}
