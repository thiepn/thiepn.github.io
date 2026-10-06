# Platform P11 — Shared Runtime Review

P11 confirms that Hub does not need a generic shared Node/Vercel backend.

## Decision

Hub's server-side aggregation belongs to Hub's product-owned runtime. The canonical Vercel project identity remains `thiepn-hub`.

There is no Hub dependency on:

- a `thiepn-platform` Vercel project;
- `platform.thiepn.dev`;
- a generic Core-owned Node service.

Core-wide API/security responsibilities continue through the existing Core Gateway at `api.thiepn.dev`. Account/Auth/Postgres/RLS/Realtime/Storage remain Supabase-owned.

## Historical `platform-health` name

The repository still contains `supabase/functions/platform-health`.

That function is classified as Account/Supabase health instrumentation. Its historical name does **not** create or imply a `platform.thiepn.dev` runtime, and P11 deliberately avoids a risky rename while existing callers are not fully inventoried.

## Hub aggregation

Search, Inbox, product aggregation and other Hub-specific server behavior stay with Hub. If a provider exposes a bounded read model, Hub consumes it through the provider/Core contract rather than moving provider ownership into a shared Platform service.

## Future rule

A generic shared runtime may only re-enter Hub architecture after a new Core ADR demonstrates at least two real product consumers of the same product-agnostic server workload and shows that centralization reduces coupling.
