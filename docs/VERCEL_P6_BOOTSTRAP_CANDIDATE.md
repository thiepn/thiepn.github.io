# P6 — Vercel Project Bootstrap, Production Environment Provisioning & First Certified Release Candidate

P6 is the first phase allowed to create real `thiepn-hub` Vercel state. It still may not move `thiepn.dev`, enable private Hub data, register OAuth, or promote a deployment.

## Initial state

Before P6, the connected Vercel account had no `thiepn-hub` project. The first bootstrap was intentionally performed through the repository's `VERCEL_TOKEN` path because the connected Vercel project-creation action is Git-linked and THIEPN requires a bare/manual-deploy project.

## Reproducible public Production configuration

The stable browser-safe Hub build configuration is source-controlled in `ops/vercel/environment-contract.json`:

- `PUBLIC_HUB_ACCOUNT_ENTRY=https://account.thiepn.dev/hub/entry`;
- `PUBLIC_HUB_AUTH_ORIGIN=https://thiepn.dev`;
- the canonical THIEPN Account Supabase URL;
- the canonical Supabase publishable key.

These are public application settings, not privileged secrets. Service-role, Supabase secret, Account secret and Core secret credentials remain forbidden.

## Bootstrap reconciler

`scripts/vercel/bootstrap-hub-project.mjs` is idempotent and:

1. creates/reuses the bare `thiepn-hub` project;
2. verifies no Git integration exists;
3. enforces Astro, Node 24, `npm ci`, `npm run build:enriched`, and `dist`;
4. disables automatic custom-domain assignment, automatic system-env exposure and feedback surfaces;
5. upserts only approved public Production variables;
6. audits environment metadata with `decrypt=false`;
7. rejects custom domains before cutover;
8. exports only project/account IDs into the CI process for Vercel CLI linkage.

The repository does not commit `.vercel/project.json` or project/account IDs.

## Candidate model

A candidate is built with:

```text
vercel pull --environment=production
vercel build --prod
vercel deploy --prebuilt --prod --skip-domain
```

The actual Vercel behavior observed in P6 is important: `--skip-domain` prevents assigning the canonical/custom domain, but Vercel may still advance its generated project `.vercel.app` alias. This is acceptable because `thiepn.dev` remains on GitHub Pages and no custom domain is attached to the Vercel project.

A certified candidate must:

- come from an immutable source SHA;
- use the audited Production environment;
- be READY on a Vercel deployment URL;
- match the qualified public artifact byte-for-byte and by SHA-256;
- keep both P4 private Notes APIs at `HUB_PRIVATE_DISABLED`;
- retain Vercel Authentication on generated deployment URLs;
- record source/project/deployment/qualification evidence;
- remain unpromoted.

## Deployment protection

The Vercel team enables SSO protection for generated `.vercel.app` deployment URLs. P6 does not disable it.

Certification therefore uses a short-lived project automation bypass:

1. generate an ephemeral 32-character bypass;
2. wait until the bypass is active on the target deployment;
3. send only the `x-vercel-protection-bypass` header during smoke checks;
4. revoke the bypass in an `always()` cleanup step.

The wait step is bounded and exists because live P6 testing demonstrated a short propagation window: representative JSON, HTML, CSS, JavaScript and WebP assets all matched exact local Production-build byte counts and SHA-256 hashes once the bypass became active.

## Server-function build qualification

P6 also exposed that Vercel can complete a prebuilt artifact while reporting NodeNext TypeScript errors for Vercel Functions. The Hub runtime was corrected to explicit `.js` ESM imports and narrowed runtime values, and repository qualification now covers the Vercel server-function typecheck so these diagnostics cannot be ignored.

## Live bootstrap state

The real Vercel project now exists:

- project: `thiepn-hub`;
- project ID: `prj_CJcePUM0sptaE0SugAZYRy9JufRX`;
- account/team: `team_LVo30en2fIX29vZH3gnYxmoi`;
- framework: Astro;
- Node: 24.x;
- Git integration: absent;
- custom domains: none;
- SSO deployment protection: enabled;
- approved public Production variables: provisioned.

Several no-canonical-domain Production candidates were created while exercising and repairing the certification pipeline. They remain isolated behind Vercel Authentication and were not promoted to `thiepn.dev`.

## Explicit non-goals

P6 does not:

- add `thiepn.dev` to Vercel;
- alter Cloudflare DNS;
- disable GitHub Pages;
- promote a Vercel deployment;
- disable Vercel deployment protection;
- enable `THIEPN_HUB_PRIVATE_RUNTIME`;
- register an OAuth client or create Notes consent;
- add Supabase service-role/secret credentials;
- mutate THIEPN Account/Core data or schema.

## Exit criterion

P6 reaches **Operational PASS** only when one immutable, Production-configured Vercel candidate passes the complete source qualification, exact public artifact verification, fail-closed private API smoke, deployment inspection and evidence-recording path while `thiepn.dev` remains unchanged.
