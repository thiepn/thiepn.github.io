# Platform P11 — Shared Runtime Review

Hub does not depend on a generic shared Node/Vercel backend.

Hub aggregation remains product-owned by `thiepn/thiepn.github.io` and Vercel project `thiepn-hub`. Core-wide API/security responsibilities remain at the Cloudflare Core Gateway on `api.thiepn.dev`; Account/data authority remains Supabase.

The historical `supabase/functions/platform-health` name is retained for compatibility and explicitly classified as Account/Supabase health instrumentation, not a `platform.thiepn.dev` service.
