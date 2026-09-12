import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => {
  console.error(`A3 SECURITY CONTRACT FAIL: ${message}`);
  process.exitCode = 1;
};
const check = (condition, message) => {
  if (!condition) fail(message);
};

const sdk = read('packages/account-sdk/index.js');
const types = read('packages/account-sdk/index.d.ts');
const pkg = JSON.parse(read('packages/account-sdk/package.json'));
const accountPage = read('src/pages/account/index.astro');
const securityUi = read('src/scripts/accountSecurity.ts');
const migration = read('supabase/migrations/20260913160000_a3_security_recovery.sql');
const canonicalSessionKey = 'sb-hycegznamzjhwinegaai-auth-token';

check(pkg.version === '1.1.0', 'SDK package must be version 1.1.0.');
check(sdk.includes("THIEPN_ACCOUNT_VERSION = '1.1.0'"), 'runtime SDK version must be 1.1.0.');
check(types.includes("THIEPN_ACCOUNT_VERSION: '1.1.0'"), 'type SDK version must be 1.1.0.');
check(sdk.includes(`sessionKey: '${canonicalSessionKey}'`), 'canonical shared session key changed.');
check(accountPage.includes("import '../../scripts/accountSecurity';"), 'account page does not load A3 security layer.');

check(sdk.includes("create_user: Boolean(shouldCreateUser)"), 'email OTP request must explicitly control user creation.');
check(securityUi.includes('shouldCreateUser: false'), 'account recovery UI must not create users through email OTP.');
check(sdk.includes("if (scope !== 'others') clear();"), 'scope=others must preserve the current local session.');
check(sdk.includes("/auth/v1/factors/${encodeURIComponent(factorId)}/challenge"), 'MFA challenge route missing.');
check(sdk.includes("/auth/v1/factors/${encodeURIComponent(factorId)}/verify"), 'MFA verification route missing.');
check(securityUi.includes('needsMfaChallenge'), 'account UI does not gate verified MFA accounts at AAL1.');
check(securityUi.includes('password.length >= 12'), 'new-account password floor is not enforced at 12 characters.');
check(securityUi.includes("password.minLength = 12"), 'password-change UI does not expose the 12-character floor.');

check(migration.includes('create or replace function public.list_thiepn_account_sessions()'), 'own-session RPC missing.');
check(migration.includes('where s.user_id = (select auth.uid())'), 'own-session RPC is not fixed to auth.uid().');
check(migration.includes('limit 50;'), 'own-session RPC must remain bounded.');
check(migration.includes('revoke all on function public.list_thiepn_account_sessions() from public;'), 'session RPC PUBLIC execute was not revoked.');
check(migration.includes('revoke all on function public.list_thiepn_account_sessions() from anon;'), 'session RPC anon execute was not revoked.');
check(migration.includes('grant execute on function public.list_thiepn_account_sessions() to authenticated;'), 'session RPC authenticated grant missing.');
check(!migration.includes('s.ip'), 'session RPC must not expose raw session IP addresses.');

const mfaGuard = "if v_has_verified_mfa and coalesce((select auth.jwt()->>'aal'), 'aal1') <> 'aal2' then";
check(migration.includes(mfaGuard), 'ecosystem deletion MFA guard missing.');
check(migration.includes("return jsonb_build_object('deleted', false, 'reason', 'mfa_required');"), 'ecosystem deletion must fail closed with mfa_required.');
check(migration.includes('create or replace function public.delete_notes_auth_identity()'), 'legacy Notes delete path is not guarded in A3 migration.');
check(migration.includes("if has_verified_mfa and coalesce((select auth.jwt()->>'aal'), 'aal1') <> 'aal2' then"), 'legacy Notes delete path does not mirror MFA guard.');

for (const [file, content] of [
  ['packages/account-sdk/index.js', sdk],
  ['src/scripts/accountSecurity.ts', securityUi],
  ['src/pages/account/index.astro', accountPage],
]) {
  check(!/service[_-]?role/i.test(content), `${file} contains a service-role reference.`);
  check(!/sb_secret_/i.test(content), `${file} contains a secret Supabase key.`);
}

if (!process.exitCode) {
  console.log('A3 security & recovery contract: PASS');
}
