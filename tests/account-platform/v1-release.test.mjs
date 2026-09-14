import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const RELEASE_SHA = '169e083f268e895cd44d8a5fe706ba5d4532bfa2';

test('Account Platform v1 manifest freezes the certified contract versions', async () => {
  const manifest = JSON.parse(await readFile(new URL('../../public/account-platform/release/v1/manifest.json', import.meta.url), 'utf8'));
  assert.equal(manifest.platform, 'THIEPN Account Platform');
  assert.equal(manifest.release, '1.0.0');
  assert.equal(manifest.immutableCommit, RELEASE_SHA);
  assert.equal(manifest.accountContract, '1.0');
  assert.equal(manifest.sdk.version, '1.0.0');
  assert.equal(manifest.sdk.contract, '1.x');
  assert.equal(manifest.ui.version, '1.0.0');
  assert.equal(manifest.developerContract, 'A8.1');
  assert.equal(manifest.operationsContract, 'A7.1');
  assert.equal(manifest.consumerManifestSchema, '1.0');
  assert.equal(manifest.newConsumerIntegrationMode, 'sdk-1.x');
});

test('future onboarding pins both reusable workflow and validator to the v1 commit', async () => {
  const onboarding = await readFile(new URL('../../docs/account-platform/ONBOARDING.md', import.meta.url), 'utf8');
  assert.match(onboarding, new RegExp(`account-consumer-conformance\\.yml@${RELEASE_SHA}`));
  assert.match(onboarding, new RegExp(`platform_ref: ${RELEASE_SHA}`));
  assert.equal(onboarding.includes('account-consumer-conformance.yml@main'), false);
});

test('release notes identify the same immutable v1 commit', async () => {
  const notes = await readFile(new URL('../../docs/account-platform/RELEASE-NOTES-1.0.0.md', import.meta.url), 'utf8');
  assert.ok(notes.includes(RELEASE_SHA));
  assert.ok(notes.includes('Account contract: `1.0`'));
  assert.ok(notes.includes('Browser SDK: `1.0.0` / contract `1.x`'));
});
