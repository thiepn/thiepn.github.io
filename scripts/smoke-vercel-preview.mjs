const args = process.argv.slice(2);
const index = args.indexOf('--url');
const raw = index >= 0 ? args[index + 1] : process.env.VERCEL_PREVIEW_URL;
if (!raw) throw new Error('Preview URL is required');

const base = new URL(raw);
if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) {
  throw new Error('Preview URL must be a clean HTTPS origin');
}
base.pathname = '/';

async function read(path, expectedStatus = 200) {
  const response = await fetch(new URL(path, base), {
    redirect: 'error',
    signal: AbortSignal.timeout(10_000),
    headers: { 'user-agent': 'THIEPN-Vercel-P3-Smoke/1' },
  });
  const text = await response.text();
  if (response.status !== expectedStatus) {
    throw new Error(`${path} returned ${response.status}, expected ${expectedStatus}`);
  }
  return { response, text };
}

for (const path of ['/', '/home/', '/search/', '/inbox/']) {
  const { text } = await read(path);
  if (!/<main\b/i.test(text) || !/THIEPN/i.test(text)) {
    throw new Error(`${path} is missing Hub structural identity`);
  }
}

const release = await read('/hub-release.json');
const releaseJson = JSON.parse(release.text);
if (releaseJson.profile !== 'public-handoffs') {
  throw new Error('Preview is not the public-handoffs release profile');
}
if (releaseJson.privateReadsEnabled === true || releaseJson.inlineWritesEnabled === true) {
  throw new Error('Preview unexpectedly enabled private Hub capabilities');
}

const missing = await read('/__vercel_p3_missing__', 404);
if (!/<main\b/i.test(missing.text) || !/THIEPN/i.test(missing.text)) {
  throw new Error('Vercel preview is not serving the custom Hub 404');
}

console.log(`THIEPN Hub Vercel preview smoke passed at ${base.origin}`);
