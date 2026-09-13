import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => {
  console.error(`A4 PLATFORM CONTRACT FAIL: ${message}`);
  process.exitCode = 1;
};
const check = (condition, message) => {
  if (!condition) fail(message);
};

const sdk = read('packages/account-sdk/index.js');
const types = read('packages/account-sdk/index.d.ts');
const pkg = JSON.parse(read('packages/account-sdk/package.json'));
const migration = read('supabase/migrations/20260913002000_a4_ecosystem_platform.sql');
const platformUi = read('src/scripts/accountPlatform.ts');
const accountPage = read('src/pages/account/index.astro');
const integration = read('docs/THIEPN_APP_INTEGRATION.md');

check(pkg.version === '1.2.0', 'SDK package must be version 1.2.0.');
check(sdk.includes("THIEPN_ACCOUNT_VERSION = '1.2.0'"), 'runtime SDK version must be 1.2.0.');
check(types.includes("THIEPN_ACCOUNT_VERSION: '1.2.0'"), 'type SDK version must be 1.2.0.');
check(sdk.includes("THIEPN_PLATFORM_VERSION = '1.0.0'"), 'runtime platform version must be 1.0.0.');
check(types.includes("THIEPN_PLATFORM_VERSION: '1.0.0'"), 'type platform version must be 1.0.0.');
check(sdk.includes("sessionKey: 'sb-hycegznamzjhwinegaai-auth-token'"), 'canonical shared session key changed.');

check(migration.includes('create table if not exists public.account_app_manifests'), 'versioned app manifest registry missing.');
check(migration.includes("identity_scope text not null default 'shared' check (identity_scope = 'shared')"), 'shared identity invariant is not enforced.');
check(migration.includes("data_scope text not null default 'isolated' check (data_scope = 'isolated')"), 'isolated app-data invariant is not enforced.');
for (const app of ['notes', 'diet', 'wordstrike']) {
  check(migration.includes(`'${app}'`), `manifest seed missing for ${app}.`);
}
check(migration.includes('alter table public.account_app_manifests enable row level security;'), 'manifest registry RLS missing.');
check(migration.includes('revoke all on table public.account_app_manifests from anon;'), 'manifest registry anon privileges were not revoked.');

check(migration.includes('create policy account_user_apps_insert_own'), 'A4 app-activity INSERT guard missing.');
check(migration.includes('create policy account_user_apps_update_own'), 'A4 app-activity UPDATE guard missing.');
check(migration.includes('(select auth.uid()) = user_id'), 'app-activity RLS must remain fixed to auth.uid().');
check((migration.match(/join public\.account_app_manifests m on m\.app_slug = a\.slug/g) ?? []).length >= 3, 'registry, activity guards and ecosystem state must all depend on versioned manifests.');
check((migration.match(/a\.active = true/g) ?? []).length >= 3, 'activity writes and ecosystem reads must require active apps.');

check(migration.includes('create or replace function public.get_thiepn_ecosystem()'), 'ecosystem state RPC missing.');
check(migration.includes('create or replace function public.export_thiepn_platform_snapshot()'), 'platform snapshot RPC missing.');
check((migration.match(/security invoker/g) ?? []).length >= 2, 'A4 read RPCs must remain SECURITY INVOKER.');
check(!/security definer/i.test(migration), 'A4 must not introduce a SECURITY DEFINER platform function.');
check(!migration.includes('touch_thiepn_app_usage'), 'A4 must use account_user_apps RLS rather than a privileged activity RPC.');
check(migration.includes("'schema', 'thiepn-platform-snapshot'"), 'snapshot schema identifier changed.');
check(migration.includes("'platformVersion', '1.0.0'"), 'snapshot platform version changed.');

for (const forbidden of [
  'notes_sync_records',
  'leaderboard_submissions',
  'daily_logs',
  'meal_items',
  'saved_foods',
  'weight_entries',
]) {
  check(!migration.includes(forbidden), `platform migration references app-owned content table ${forbidden}.`);
}

check(sdk.includes('async function getEcosystemState'), 'SDK ecosystem-state API missing.');
check(sdk.includes('async function recordAppActivity'), 'SDK app-activity contract missing.');
check(sdk.includes("/rest/v1/account_user_apps?${query}"), 'SDK app activity must use the existing RLS table.');
check(sdk.includes("on_conflict: 'user_id,app_slug'"), 'SDK app activity upsert contract changed.');
check(sdk.includes("source: 'app'"), 'SDK app activity source must remain app.');
check(sdk.includes('async function exportPlatformSnapshot'), 'SDK platform export API missing.');
check(sdk.includes('/rest/v1/rpc/export_thiepn_platform_snapshot'), 'SDK platform export RPC path changed.');

check(accountPage.includes("import '../../scripts/accountPlatform';"), 'account page does not load the A4 platform surface.');
check(platformUi.includes('One identity, explicit app boundaries.'), 'platform boundary UI missing.');
check(platformUi.includes('App-owned content was not included.'), 'metadata-only export confirmation missing.');
check(platformUi.includes('downloadSnapshot'), 'browser platform export path missing.');

check(integration.includes('identity_scope = shared'), 'consumer guide does not preserve shared identity.');
check(integration.includes('data_scope     = isolated'), 'consumer guide does not preserve isolated app data.');
check(integration.includes('recordAppActivity()'), 'consumer guide does not require activity integration.');
check(integration.includes('Do not invent "disconnect"'), 'consumer guide must forbid misleading generic disconnect semantics.');

for (const [file, content] of [
  ['packages/account-sdk/index.js', sdk],
  ['src/scripts/accountPlatform.ts', platformUi],
  ['src/pages/account/index.astro', accountPage],
]) {
  check(!/service[_-]?role/i.test(content), `${file} contains a service-role reference.`);
  check(!/sb_secret_/i.test(content), `${file} contains a secret Supabase key.`);
}

if (!process.exitCode) console.log('A4 ecosystem platform contract: PASS');
