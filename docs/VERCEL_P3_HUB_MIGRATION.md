# P3 — THIEPN Hub Vercel Migration Foundation

**Status:** staged migration foundation  
**Production:** GitHub Pages remains authoritative  
**Canonical domain:** `https://thiepn.dev` remains unchanged  
**Vercel project:** `thiepn-hub`  
**Deployment mode:** manual Preview only

## Goal

Make the real THIEPN Hub the first product-owned Vercel workload without changing production traffic or introducing new product-server architecture prematurely.

P3 deliberately migrates **hosting first**. The Hub remains the current Astro static application and keeps its existing Account/Core/Supabase contracts. Server-owned Hub integration begins in P4 only after the Vercel hosting boundary is proven.

## Runtime topology

```text
GitHub
  thiepn/thiepn.github.io
        |
        +-- existing main -> GitHub Pages -> thiepn.dev   [production unchanged]
        |
        +-- manual P3 stage
              |
              +-- source qualification
              +-- Vercel project provision/reuse
              +-- Vercel Astro build
              +-- exact artifact qualification
              +-- Preview deployment
              +-- exact-hash smoke + hosting smoke
```

## Project policy

`thiepn-hub` is provisioned through the Vercel REST API using the CI token.

The project is intentionally **not connected to GitHub**. If an existing project named `thiepn-hub` is Git-linked, provisioning fails closed.

`vercel.json` also sets:

```json
{
  "git": {
    "deploymentEnabled": false
  }
}
```

This preserves the owner's workflow: pushes and PRs do not create Vercel deployments.

## Build parity

The staged build uses Node 24 and the same public Hub configuration used by the current Pages release:

- Account entry from the repository variable;
- canonical auth origin `https://thiepn.dev`;
- the public THIEPN Supabase project URL;
- the repository's public Supabase publishable key.

Cloudflare Web Analytics is intentionally empty on Vercel Preview so staging traffic cannot contaminate production analytics.

No private Hub provider flags are enabled in P3. The existing `public-handoffs` release gate remains authoritative.

## Artifact verification

P3 does not accept “Vercel says READY” as sufficient.

After `vercel build`, `scripts/qualify-hub-release.mjs` hashes the actual `.vercel/output/static` artifact. After deployment, `scripts/smoke-hub-release.mjs` re-fetches those public assets from the Preview URL and verifies their exact size and SHA-256.

A second hosting smoke validates:

- Home, Search and Inbox route serving;
- Hub release profile;
- private capability default-off state;
- custom 404 behavior;
- HTTPS Preview origin.

## Production invariants

P3 must not:

- change `CNAME`;
- change Cloudflare DNS;
- assign `thiepn.dev` to Vercel;
- disable GitHub Pages;
- use `--prod`;
- promote a Vercel deployment;
- add Hub server functions;
- change Supabase schemas/RLS/RPCs;
- activate private provider reads;
- migrate THIEPN Account.

## P4 handoff

Once a staged Vercel artifact is proven, P4 may add the first Hub-owned server boundary and port still-valid H12/H13 authorization/Notes projection behavior from the preserved historical Core branch into the Hub-owned runtime.

That migration must preserve provider authorization, request-size bounds, cancellation, exact-origin CORS, current-consent checks and owner-projection tests rather than copying the old central-runtime ownership model.

## Exit criteria

P3 is source-complete when:

- the Hub has a manual-only Vercel Preview workflow;
- `thiepn-hub` provisioning is idempotent and refuses Git linkage;
- automatic Vercel Git deployment is disabled;
- the exact Vercel output is qualified before deployment;
- Preview smoke verifies exact served bytes and routing behavior;
- normal Hub quality CI passes.

## Bootstrap execution state

A one-time Preview-only bootstrap probe ran from this branch after the normal Hub Quality and provider-integration gates passed.

Observed repository configuration:

- `VERCEL_TOKEN`: not configured;
- `HUB_ACCOUNT_ENTRY` repository variable: empty in the bootstrap context;
- `THIEPN_SUPABASE_PUBLISHABLE_KEY` repository variable: empty in the bootstrap context.

Because `VERCEL_TOKEN` was absent, every Vercel mutation/build/deploy step was skipped. No Vercel project, deployment, alias or domain was created. The temporary push-triggered bootstrap workflow was removed immediately afterward.

The empty public Hub variables do not weaken P3's public-handoffs profile because private provider reads remain disabled, but P4 must reconcile them before enabling Account/Core-backed Hub functionality.

P3 is operationally complete only after one real Preview deployment passes those checks.
