import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  THIEPN_ACCOUNT,
  assertAllowedRedirect,
  classifyAccountError,
  createThiepnAccount,
  createThiepnClient,
} from '../../public/account-platform/sdk/v1/index.js';
import { validateConsumerManifest } from '../../scripts/validate-account-consumer.mjs';

test('SDK 1.0 freezes the canonical shared project and storage authority', () => {
  assert.equal(THIEPN_ACCOUNT.sdkVersion, '1.0.0');
  assert.equal(THIEPN_ACCOUNT.accountContract, '1.0');
  assert.equal(THIEPN_ACCOUNT.projectRef, 'hycegznamzjhwinegaai');
  assert.equal(THIEPN_ACCOUNT.storageKey, 'sb-hycegznamzjhwinegaai-auth-token');
  assert.equal(THIEPN_ACCOUNT.sessionAuthority, 'thiepn-account');
});

test('SDK creates Supabase clients with the canonical shared auth storage contract', () => {
  let args;
  const client = createThiepnClient((...received) => { args = received; return { auth: {} }; });
  assert.ok(client);
  assert.equal(args[0], THIEPN_ACCOUNT.url);
  assert.equal(args[1], THIEPN_ACCOUNT.publishableKey);
  assert.deepEqual(args[2].auth, {
    storageKey: THIEPN_ACCOUNT.storageKey,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  });
});

test('redirect guard accepts THIEPN and local development origins and rejects foreign origins', () => {
  assert.equal(assertAllowedRedirect('/notes/', { baseUrl: 'https://thiepn.dev/example/' }), 'https://thiepn.dev/notes/');
  assert.equal(assertAllowedRedirect('/callback', { baseUrl: 'http://localhost:8000/' }), 'http://localhost:8000/callback');
  assert.throws(() => assertAllowedRedirect('https://evil.example/callback', { baseUrl: 'https://thiepn.dev/' }));
});

test('failure taxonomy keeps network, authentication and authorization distinct', () => {
  assert.equal(classifyAccountError({ name: 'TypeError', message: 'Failed to fetch' }), 'network');
  assert.equal(classifyAccountError({ status: 401 }), 'authentication');
  assert.equal(classifyAccountError({ status: 403 }), 'authorization');
  assert.equal(classifyAccountError({ status: 429 }), 'rate_limit');
  assert.equal(classifyAccountError({ status: 503 }), 'service');
});

test('sign-out defaults to local scope and normalized session never exposes tokens', async () => {
  let scope = null;
  const mock = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signOut: async (input) => { scope = input.scope; return { data: {}, error: null }; },
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  };
  const account = createThiepnAccount({ client: mock, appSlug: 'reference-app', redirectTo: 'https://thiepn.dev/reference-app/' });
  await account.signOut();
  assert.equal(scope, 'local');
  assert.equal(JSON.stringify(await account.getSession()).includes('token'), false);
});

test('recovery completion and security helpers stay behind the SDK boundary', async () => {
  const calls = [];
  const user = { id: '00000000-0000-4000-8000-000000000001', email: 'user@example.test' };
  const mock = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user }, error: null }),
      updateUser: async (input) => { calls.push(['updateUser', input]); return { data: { user }, error: null }; },
      resend: async (input) => { calls.push(['resend', input]); return { data: {}, error: null }; },
      reauthenticate: async () => { calls.push(['reauthenticate']); return { data: {}, error: null }; },
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  };
  const account = createThiepnAccount({ client: mock, appSlug: 'reference-app', redirectTo: 'https://thiepn.dev/reference-app/' });
  const updated = await account.updatePassword({ password: 'new-password', currentPassword: 'old-password' });
  await account.updateEmail({ email: 'next@example.test' });
  await account.resendSignupConfirmation({ email: 'next@example.test' });
  await account.reauthenticate();
  assert.equal(updated.id, user.id);
  assert.deepEqual(calls[0], ['updateUser', { password: 'new-password', currentPassword: 'old-password' }]);
  assert.deepEqual(calls[1], ['updateUser', { email: 'next@example.test' }]);
  assert.equal(calls[2][0], 'resend');
  assert.equal(calls[2][1].options.emailRedirectTo, 'https://thiepn.dev/reference-app/');
  assert.equal(calls[3][0], 'reauthenticate');
});

test('reference consumer manifest conforms to the frozen 1.x contract', async () => {
  const manifest = JSON.parse(await readFile(new URL('../../examples/account-consumer/.well-known/thiepn-app.json', import.meta.url), 'utf8'));
  assert.deepEqual(validateConsumerManifest(manifest), []);
  assert.equal(manifest.integrationMode, 'sdk-1.x');
});

test('new-consumer validator forbids raw session restoration and legacy auth authority', async () => {
  const validator = await readFile(new URL('../../scripts/validate-account-consumer.mjs', import.meta.url), 'utf8');
  assert.match(validator, /app-managed Supabase session restoration/);
  assert.match(validator, /\\\.auth\\\.setSession/);
  assert.match(validator, /implicit\/global Supabase sign-out/);
  assert.match(validator, /localStorage\\\\\.clear/);
});
