# A5 — Consumer Integration & Cutover

## Purpose

A5 is the ecosystem cutover phase that moves the current authenticated THIEPN apps onto the A1–A4 account/platform contracts without collapsing their product-specific data, reliability, or release architectures.

A5 applies to the current first-party consumers:

- Notes
- Diet Copilot
- WORDSTRIKE

The governing invariant remains:

```text
identity = shared
app data = isolated
```

## Platform baseline

Every A5 consumer pins the certified A4 contract:

- Account SDK semantics: `1.2.0`
- Platform contract: `1.0.0`
- certified source SHA: `124221f39a932d50f9a86ad5c3da2d8fd1fe50af`
- canonical Supabase project: `hycegznamzjhwinegaai`
- canonical session key: `sb-hycegznamzjhwinegaai-auth-token`

Consumers bundle, vendor, or implement a narrowly scoped local adapter pinned to that contract. They do not runtime-load mutable account code from another THIEPN app.

## A5 migration rule

A consumer is not considered cut over merely because it points at the shared Supabase project.

It must deliberately integrate:

1. canonical account/session identity;
2. legacy same-project session migration where applicable;
3. A4 app-activity metadata using its registered app slug;
4. A3 account assurance/MFA handoff state;
5. explicit local-browser sign-out semantics;
6. permanent repository-level regression contracts;
7. complete existing app release certification.

The app's own data client may remain in place when replacing it would create unnecessary product risk.

## Product-specific preservation

### Notes

Notes keeps its mature local-first/sync architecture.

A5 may centralize common session semantics, but it must not redesign:

- local Dexie storage;
- sync queue/merge behavior;
- refresh-token request coalescing;
- private workspace claim/access;
- attachment storage;
- backup/restore/import/export;
- PWA/offline certification;
- Notes-specific deletion/recovery paths.

A4 activity metadata is best-effort and must never block local startup or cloud sync.

### Diet Copilot

Diet keeps `supabase-js` as its auth/data/realtime engine and retains its Firefox/Zen recovery vault.

The recovery vault remains same-project token/session recovery only. It must not store account passwords.

A transient browser/bootstrap signed-out event is not permission to destroy the recovery vault. Explicit user sign-out remains the authoritative permanent-clear path.

### WORDSTRIKE

WORDSTRIKE keeps `supabase-js` for OAuth, refresh, leaderboard, RPC, realtime, and game data.

The shared account adapter owns ecosystem/session semantics around that client. A5 must not alter gameplay, local statistics, leaderboard ownership, or realtime data boundaries merely to standardize identity.

## Activity semantics

A5 consumers call the A4 activity contract only after real authenticated use.

Current app ids:

```text
notes
  diet
wordstrike
```

The live A4 Row Level Security policy is authoritative. An activity row must:

- belong to `auth.uid()`;
- target the exact `account_user_apps.app_slug` being written;
- target an active app;
- target an app with a versioned platform manifest.

Activity failure is non-critical telemetry-like account metadata and must not block core app behavior.

## MFA staging

A5 consumers expose or internally understand the A3 handoff state:

```text
verified MFA factor + aal1 session => additional verification required
```

A5 does **not** enable ecosystem-wide restrictive AAL2 policies on Notes, Diet, or WORDSTRIKE app data.

That enforcement remains a later explicit security rollout because each consumer first needs a complete second-factor challenge UX and recovery certification. Premature AAL2 RLS would convert an optional account-security feature into an app lockout.

Central account-management/deletion surfaces remain protected by A3 as already certified.

## Data boundary

The following are prohibited by A5:

- Notes content exposed to Diet or WORDSTRIKE;
- Diet history exposed to Notes or WORDSTRIKE;
- WORDSTRIKE scores/progress exposed to unrelated apps;
- adding app content to the A4 platform snapshot;
- a generic first-party app "disconnect" control that does not truthfully revoke identity/data access;
- service-role credentials in browser code;
- replacing product-specific backup/deletion contracts with the metadata-only platform export.

## Consumer certification

Each consumer has its own branch/PR and is independently certified against its existing repository release architecture.

A5 is complete only when all three consumers have an exact immutable candidate SHA with:

- the consumer's account-platform contract green;
- unit/static checks green;
- its existing production build checks green;
- relevant browser regressions green;
- no unresolved A5 Blocker or High defect.

A consumer with an inherited pre-existing red workflow must be compared against its exact `main` baseline; A5 must neither hide inherited defects nor misclassify them as new regressions.

## Promotion sequencing

A5 is stacked on the certified A4 platform branch. A4 is stacked on A3, which is stacked on A2/A1 work.

Consumer certification does not authorize merging the central stack out of sequence.

The correct release sequence is to promote the account-platform stack deliberately, then merge/deploy each certified consumer with its pinned compatible platform contract.

## Final certification matrix

This section is intentionally filled only after each exact consumer head completes its native release gate. Do not replace pending evidence with assumptions.

| Consumer | PR | Candidate SHA | Status |
| --- | --- | --- | --- |
| Notes | `thiepn/notes#56` | `1da1229e06ed6bb54dc985d2a71eef0707532d3a` | Pending final release/P20/PWA browser certification |
| Diet Copilot | `thiepn/diet#2` | `339d02f128a656514d995f9db2a06d39248976ef` | Certified |
| WORDSTRIKE | `thiepn/wordstrike#95` | `97f6f8941752d86f69c43d0542361094212e23df` | Certified |
