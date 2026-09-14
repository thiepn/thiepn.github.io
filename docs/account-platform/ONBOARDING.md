# Future App Onboarding

Use this sequence for every new THIEPN account-enabled web app.

1. **Choose identity:** reserve a lowercase unique app slug and same-origin path such as `/my-app/`.
2. **Declare the contract:** add `.well-known/thiepn-app.json` using schema `1.0` and `integrationMode: sdk-1.x`.
3. **Integrate SDK 1.x:** import `/account-platform/sdk/v1/index.js`; do not copy auth/session code from an existing app.
4. **Design degraded mode:** define what remains usable when Auth/backend/network is unavailable. A network failure must not trigger logout or delete local data.
5. **Build app-data authorization:** schema/RLS/RPC/Edge Functions must enforce canonical `auth.uid()` ownership or reviewed server-side authorization.
6. **Register the app:** add reviewed `account_apps` and `account_app_manifests` rows using `NEW-APP-REGISTRATION.sql` as a template. Do not create a parallel app registry.
7. **Configure callbacks:** allow only the required `https://thiepn.dev/<app>/` callback/recovery routes plus explicit localhost development routes.
8. **Conformance check:** enable the reusable central workflow below. It is pinned to the immutable v1.0 release commit so unrelated central-site work cannot change the validation contract.
9. **Deploy and smoke:** verify the app shell, signed-out boot, sign-in/recovery paths applicable to the app, offline/degraded behavior and local sign-out.
10. **Operations:** add critical online surfaces to A7 monitoring when an outage should be centrally visible.
11. **Certify:** record the consumer version/commit, tests, remaining manual gates and final onboarding verdict.

## Reusable conformance workflow

Add `.github/workflows/thiepn-account.yml` to the new app repository:

```yaml
name: THIEPN Account Contract

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  account-contract:
    uses: thiepn/thiepn.github.io/.github/workflows/account-consumer-conformance.yml@169e083f268e895cd44d8a5fe706ba5d4532bfa2
    with:
      platform_ref: 169e083f268e895cd44d8a5fe706ba5d4532bfa2
```

If the app lives below the repository root, also pass `consumer_path: 'path/to/app'`.

The commit above is the THIEPN Account Platform v1.0 immutable release baseline. Do not replace it with `@main`; upgrading the platform contract should be an explicit, reviewed consumer change.

The existing `account_user_apps` table remains the user-to-app state/entitlement layer. New apps should reuse it rather than inventing an app-specific account-membership table.
