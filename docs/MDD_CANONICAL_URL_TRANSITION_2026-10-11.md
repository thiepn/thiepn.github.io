# My Daily Devotion — preferred Hub URL and legacy journal origin (2026-10-11)

## Canonical launch decision (draft only)

- **Preferred public launch URL:** https://mdd.thiepn.dev/
- **Existing browser-journal access:** https://thiepn.dev/my-daily-devotion/
- This PR updates Hub's `bible/devotion` product-module launcher and the Faith action in Daily Home. The compatibility alias `mdd` continues to resolve to `bible/devotion`. The Bible family/default `bible/study` remains staged, and the curated 27-app public catalogue remains unchanged.
- A Hub launch opens the MDD application on the **new origin**. It **does not** transfer old-origin IndexedDB or cookies, create an account or sync a journal. The link cannot and must not redirect the original URL. The old URL continues to serve original local records if the same device/browser profile is used.
- Hub intentionally does not advertise the old origin as a normal app launcher. It remains documented for data access and recovery. For an existing data-bearing profile, users should visit the old URL before assuming the new hostname has their prior journal.

## Technical evidence and ownership

- Cloudflare's `mdd.thiepn.dev` custom Worker domain was reverified enabled on `mdd-legacy-origin-bridge`, with a proxied AAAA record and active matching certificate. This Worker currently fetches app assets from the legacy GitHub Pages path: **the old hosting path must stay available for the new hostname to work**.
- Earlier Cloudflare Browser Rendering verified both new and old application documents render a `<main>`. This is not evidence of transferred journal data or exact v1.3 deployment. No DNS, hosting or Worker configuration was changed in this draft.
- Exact pre-draft Hub main: `29537702c4e3698cb780bcc3c479e385d29bd3c8`.
- MDD source has a separate source-only acceptance/transfer handoff in draft [PR #79](https://github.com/thiepn/my-daily-devotion/pull/79). Avoid rebasing or merging that PR here. MDD certified source baseline remains `faa2bac13dd7bc3b46f462da4d32c351d2c1ef7f`.
- The registry module changes from `launchUrl:null, state:staged` to `launchUrl:https://mdd.thiepn.dev/, state:active` because the launch URL resolves. Parent Bible product state stays staged for the still-unlaunched Study default.
- No other Hub project, generated catalogue, frozen app identity, release lock, Account connector, PWA, redirect or legacy URL changed.

## Data boundaries and release gates

1. Browser storage is isolated by **scheme + host + port**, not URL path. A Cloudflare proxy or DNS change cannot read or transfer old-origin journal records.
2. Existing encrypted portable backup/restore requires an opt-in reviewed local export/import; ordinary format v1 omits unfinished drafts, saved versions and Recently removed recovery copies. **No real-owner transfer was executed or tested.**
3. Owner-directed manual-device, keyboard, accessibility, real journal migration and off-device restoration checks remain **WAIVED / NOT TESTED**, **not PASS**.
4. Keep old and new URLs working, and preserve all browser data and both service-worker scopes; do not clear caches or storage.
5. CI for this source-only PR must be checked at its exact head. All private Account integration jobs without trusted credentials stay **BLOCKED / NOT TESTED**, not falsely green.
6. Draft review is not deployment approval. Do not merge, publish, deploy, edit DNS or settings, or redirect/remove the old URL without separate explicit authorization.

## Acceptance criteria for this draft

- `mdd` alias still resolves to `bible/devotion`; module launch URL matches `https://mdd.thiepn.dev/`, module state is active.
- Hub Faith action resolves only to the new URL, including for a browser with an existing Hub profile.
- Public 27-app Hub project count and canonical routes stay identical; no path redirect is introduced.
- Typecheck, unit tests, registry validation and nonprivileged CI checks should pass.
