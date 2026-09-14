const BASE = 'https://thiepn.dev';
const TARGETS = [
  { path: '/account-platform/sdk/v1/index.js', markers: ["sdkVersion: '1.0.0'", 'createThiepnAccount', 'updatePassword'] },
  { path: '/account-platform/sdk/v1/index.d.ts', markers: ["sdkVersion: '1.0.0'", 'updatePassword', 'reauthenticate'] },
  { path: '/account-platform/sdk/v1/manifest.json', json: (value) => value?.version === '1.0.0' && value?.sdkContract === '1.x' && value?.module === '/account-platform/sdk/v1/index.js' },
  { path: '/account-platform/ui/v1/index.js', markers: ['mountThiepnAccountControl', 'thiepn-account:signin-request'] },
  { path: '/account-platform/ui/v1/styles.css', markers: ['.thiepn-account-control'] },
  { path: '/account-platform/ui/v1/manifest.json', json: (value) => value?.version === '1.0.0' && value?.sdkContract === '1.x' },
  { path: '/account-platform/contracts/thiepn-app.schema.json', json: (value) => value?.title === 'THIEPN Account Consumer Manifest' && value?.properties?.sdkContract?.const === '1.x' },
  { path: '/dev/account-platform/', markers: ['THIEPN Account', 'Developer Platform', 'SDK'] },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchTarget(target) {
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const url = `${BASE}${target.path}?a8-publication=${Date.now()}`;
      const response = await fetch(url, {
        redirect: 'follow',
        cache: 'no-store',
        headers: { 'User-Agent': 'thiepn-account-platform-publication-check/1.0' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      if (target.json) {
        let value;
        try { value = JSON.parse(text); }
        catch { throw new Error('invalid JSON'); }
        if (!target.json(value)) throw new Error('JSON contract mismatch');
      }
      for (const marker of target.markers || []) {
        if (!text.includes(marker)) throw new Error(`missing marker: ${marker}`);
      }
      return { path: target.path, status: response.status, bytes: Buffer.byteLength(text) };
    } catch (error) {
      lastError = error;
      if (attempt < 5) await sleep(attempt * 1000);
    }
  }
  throw new Error(`${target.path}: ${lastError?.message || 'publication check failed'}`);
}

const results = [];
for (const target of TARGETS) {
  const result = await fetchTarget(target);
  results.push(result);
  console.log(`PASS ${result.path} (${result.status}, ${result.bytes} bytes)`);
}
console.log(`A8 publication verification passed for ${results.length} production assets.`);
