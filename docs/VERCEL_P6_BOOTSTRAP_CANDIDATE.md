# P6 — Vercel Project Bootstrap, Production Environment Provisioning & First Certified Release Candidate

P6 is the first phase that is allowed to create real `thiepn-hub` Vercel state. It still may not move `thiepn.dev`, enable private Hub data, or promote a deployment.

## Initial live state

The connected Vercel account was inspected before implementation:

- projects named `thiepn-hub`: **0**;
- Vercel teams returned by the connected account: **0**;
- therefore P6 is a clean personal-scope bootstrap rather than a project migration.

The Vercel connected app can inspect and mutate existing projects but its supported project-creation action intentionally creates Git-linked projects. P6 refuses that path because THIEPN uses manual CLI/REST deployment. Bare project creation therefore remains the authenticated `VERCEL_TOKEN` CI path established in P3/P5.

## Reproducible public build configuration

The following values are public application configuration and are source-controlled in `ops/vercel/environment-contract.json`:

- `PUBLIC_HUB_ACCOUNT_ENTRY=https://account.thiepn.dev/hub/entry`;
- `PUBLIC_HUB_AUTH_ORIGIN=https://thiepn.dev`;
- the canonical THIEPN Account Supabase URL;
- the canonical Supabase **publishable** key.

The publishable key is deliberately not treated as a secret; it is intended for browser/public application use. Service-role, Supabase secret, Account secret and Core secret keys remain explicitly forbidden.

Repository variables are no longer required for these stable public values. This removes the P3/P4 drift where the GitHub variables were empty.

## Bootstrap reconciler

`scripts/vercel/bootstrap-hub-project.mjs` is idempotent and performs:

1. create/reuse the bare `thiepn-hub` project;
2. harden/reconcile project settings;
3. verify no Git integration exists;
4. set Node 24, Astro, `npm ci`, `npm run build:enriched`, and `dist`;
5. disable automatic custom-domain assignment;
6. disable automatic system-env exposure and Vercel feedback surfaces;
7. upsert only the approved public Production environment variables;
8. retrieve env metadata with `decrypt=false`;
9. run the P5 forbidden/required environment audit;
10. reject any custom domain before the later cutover phase.

The reconciler writes only the Vercel project ID/name to GitHub outputs. It never prints environment values.

## Production environment authority

Production candidate/promotion/rollback workflows no longer inject GitHub repository variables over the Vercel environment. They first run the bootstrap/audit and then execute:

```text
vercel pull --environment=production
vercel build --prod
```

This makes the Vercel Production environment the single build-time configuration authority for certified artifacts.

## First candidate

The first P6 candidate must be:

- built from the exact P6 source SHA;
- built with the Vercel Production environment;
- deployed with `--prod --skip-domain`;
- served only from its `.vercel.app` deployment URL;
- byte-for-byte verified against the qualified public artifact;
- confirmed to keep both P4 private Notes APIs at `HUB_PRIVATE_DISABLED`;
- recorded with source SHA, project identity, deployment URL and qualification hash;
- **not promoted**.

## Explicit non-goals

P6 does not:

- add `thiepn.dev` to Vercel;
- alter Cloudflare DNS;
- disable GitHub Pages;
- promote a Vercel deployment;
- enable `THIEPN_HUB_PRIVATE_RUNTIME`;
- register an OAuth client;
- create Notes consent;
- add any Supabase secret/service-role credential;
- mutate THIEPN Account/Core data or schema.

## Exit states

**Operational PASS:** the real bare project exists, approved Production public env is provisioned, no custom domain is attached, and one READY no-domain production-configured candidate passes exact-artifact and fail-closed smoke.

**Credential-blocked:** if `VERCEL_TOKEN` is absent from GitHub Actions, the bootstrap probe must terminate before any Vercel write. Source controls may still be complete, but P6 is not operationally complete.

## First bootstrap execution

A one-time push-triggered bootstrap probe ran after the P6 source head passed the full Quality and Account/Notes/TMS60/Library integration matrix.

Observed GitHub Actions state:

- `VERCEL_TOKEN`: **not configured**.

The workflow therefore stopped immediately after credential detection. Every project mutation, environment upsert, build, deployment, artifact qualification, smoke check and evidence-upload step was skipped.

A live Vercel read after the probe confirmed:

- projects named `thiepn-hub`: **0**;
- deployments for `thiepn-hub`: **0**.

No Vercel state changed. The one-time push trigger was removed immediately after verification. The permanent P5/P6 manual candidate workflow remains available for use after the credential is deliberately configured.

**Current P6 status:** source/control-plane complete; operational bootstrap and first certified candidate are blocked only by the missing GitHub Actions `VERCEL_TOKEN`.

## Observed P6 execution status — 4 October 2026

The source qualification completed successfully before the first external-write attempt.

A temporary one-shot branch workflow then tested the CI credential boundary before checkout or any Vercel API call. Its first step, `test -n "$VERCEL_TOKEN"`, failed because the repository does not currently expose a `VERCEL_TOKEN` Actions secret. Every subsequent checkout, bootstrap, build, deployment and evidence step was skipped.

The connected Vercel account was re-queried after that run and still returned zero projects named `thiepn-hub`. Therefore:

- no Vercel project was created;
- no Vercel environment variable was written;
- no deployment/candidate exists;
- no domain or alias changed;
- no production traffic changed.

The temporary push-triggered workflow and trigger file were removed immediately after the probe. Permanent deployment automation remains manual-only through the P5 `workflow_dispatch` pipelines.

P6 is therefore **source-complete but operationally credential-blocked**. The only missing prerequisite for the real bootstrap/candidate is a repository Actions secret named `VERCEL_TOKEN` with permission to manage the intended Vercel account. Once that secret exists, the permanent `Build THIEPN Hub Vercel release candidate` workflow can execute the already-certified bootstrap path without another architecture change.
