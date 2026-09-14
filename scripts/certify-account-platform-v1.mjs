const PLATFORM_SHA = '169e083f268e895cd44d8a5fe706ba5d4532bfa2';
const EXPECTED = [
  ['central release manifest', 'https://thiepn.dev/account-platform/release/v1/manifest.json', { release: '1.0.0', immutableCommit: PLATFORM_SHA, accountContract: '1.0', developerContract: 'A8.1', operationsContract: 'A7.1' }],
  ['Notes release record', 'https://thiepn.dev/notes/.well-known/thiepn-account-release.json', { platformRelease: '1.0.0', platformCommit: PLATFORM_SHA, accountContract: '1.0', sdkContract: '1.x', integrationMode: 'certified-legacy' }],
  ['Diet release record', 'https://thiepn.dev/diet/.well-known/thiepn-account-release.json', { platformRelease: '1.0.0', platformCommit: PLATFORM_SHA, accountContract: '1.0', sdkContract: '1.x', integrationMode: 'certified-legacy' }],
  ['WORDSTRIKE release record', 'https://thiepn.dev/wordstrike/.well-known/thiepn-account-release.json', { platformRelease: '1.0.0', platformCommit: PLATFORM_SHA, accountContract: '1.0', sdkContract: '1.x', integrationMode: 'certified-legacy' }],
];

async function fetchJson(label, url) {
  const response = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'thiepn-account-platform-v1-certification' } });
  if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}.`);
  return response.json();
}

for (const [label, url, expected] of EXPECTED) {
  const data = await fetchJson(label, url);
  for (const [key, value] of Object.entries(expected)) {
    if (data[key] !== value) throw new Error(`${label} mismatch for ${key}: expected ${value}, got ${data[key]}`);
  }
  console.log(`PASS ${label}`);
}

const sdk = await fetchJson('SDK manifest', 'https://thiepn.dev/account-platform/sdk/v1/manifest.json');
if (sdk.version !== '1.0.0' || sdk.contract !== '1.x') throw new Error('Published SDK manifest is not v1.0.0 / 1.x.');
const ui = await fetchJson('UI manifest', 'https://thiepn.dev/account-platform/ui/v1/manifest.json');
if (ui.version !== '1.0.0') throw new Error('Published shared UI manifest is not v1.0.0.');

console.log('THIEPN Account Platform v1 production certification PASS.');
