const PLATFORM_SHA = '169e083f268e895cd44d8a5fe706ba5d4532bfa2';
const CONSUMERS = [
  {
    label: 'Notes',
    releaseUrl: 'https://raw.githubusercontent.com/thiepn/notes/25e447e818e0223fac1ff931778d9511e24b9844/public/.well-known/thiepn-account-release.json',
    productionUrl: 'https://thiepn.dev/notes/',
  },
  {
    label: 'Diet',
    releaseUrl: 'https://raw.githubusercontent.com/thiepn/diet/e7319479b37a00a7cf53d20fb95c4f6daee5002b/.well-known/thiepn-account-release.json',
    productionUrl: 'https://thiepn.dev/diet/',
  },
  {
    label: 'WORDSTRIKE',
    releaseUrl: 'https://raw.githubusercontent.com/thiepn/wordstrike/dfa38aac70cb1dfe26c84059d24e6730d867c162/.well-known/thiepn-account-release.json',
    productionUrl: 'https://thiepn.dev/wordstrike/',
  },
];

async function fetchOk(label, url, accept = '*/*') {
  const response = await fetch(url, { headers: { accept, 'user-agent': 'thiepn-account-platform-v1-certification' }, redirect: 'follow' });
  if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}.`);
  return response;
}

async function fetchJson(label, url) {
  return (await fetchOk(label, url, 'application/json')).json();
}

const central = await fetchJson('central release manifest', 'https://thiepn.dev/account-platform/release/v1/manifest.json');
for (const [key, value] of Object.entries({
  release: '1.0.0',
  immutableCommit: PLATFORM_SHA,
  accountContract: '1.0',
  developerContract: 'A8.1',
  operationsContract: 'A7.1',
})) {
  if (central[key] !== value) throw new Error(`central release manifest mismatch for ${key}: expected ${value}, got ${central[key]}`);
}
console.log('PASS central release manifest');

for (const consumer of CONSUMERS) {
  const release = await fetchJson(`${consumer.label} release record`, consumer.releaseUrl);
  for (const [key, value] of Object.entries({
    platformRelease: '1.0.0',
    platformCommit: PLATFORM_SHA,
    accountContract: '1.0',
    sdkContract: '1.x',
    integrationMode: 'certified-legacy',
  })) {
    if (release[key] !== value) throw new Error(`${consumer.label} release record mismatch for ${key}: expected ${value}, got ${release[key]}`);
  }
  await fetchOk(`${consumer.label} production shell`, consumer.productionUrl, 'text/html');
  console.log(`PASS ${consumer.label} immutable release record + production shell`);
}

const sdk = await fetchJson('SDK manifest', 'https://thiepn.dev/account-platform/sdk/v1/manifest.json');
if (sdk.version !== '1.0.0' || sdk.contract !== '1.x') throw new Error('Published SDK manifest is not v1.0.0 / 1.x.');
const ui = await fetchJson('UI manifest', 'https://thiepn.dev/account-platform/ui/v1/manifest.json');
if (ui.version !== '1.0.0') throw new Error('Published shared UI manifest is not v1.0.0.');

console.log('THIEPN Account Platform v1 cross-repository certification PASS.');
