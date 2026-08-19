# THE INDEX — Automation Contract

Phase 10 turns catalogue growth into a data workflow. Automation may derive, validate, enrich, capture, and publish catalogue data, but it must not decide editorial identity.

## Non-negotiable boundary

Human-curated fields remain authoritative:

- project code and stable slug;
- public title, subtitle, summary, and long-form record text;
- category, type, public status, and visibility;
- tags, collections, relationships, and Featured/archive curation;
- light/dark accent;
- preview tier, story, provenance, and capability/gallery copy;
- launch destination and public action language.

GitHub automation may enrich only machine metadata such as repository existence, archive state, default branch, language, push/update timestamps, Pages hints, topics, size, and stars. A GitHub API failure must never remove a project from the hub or block the static build.

## Normal project-add workflow

```bash
npm run project:add -- \
  --title "Example Project" \
  --category games \
  --repo thiepn/example-project \
  --live https://thiepn.github.io/example-project/
```

Default behavior:

1. propose the next permanent code for the category;
2. derive or accept a stable slug;
3. create one valid HOLD project record;
4. register the code in `catalogue-ledger.json`;
5. regenerate derived catalogue files;
6. leave public curation unchanged until the artifact is explicitly listed.

A listed add may use `--visibility listed`; it is appended to the curated archive order so no UI component edit is required.

Use `--dry-run` to inspect the code/slug proposal without writing. Interactive runs ask you to accept the proposed permanent accession code; non-interactive automation must pass `--yes` explicitly.

## Derived catalogue outputs

`npm run catalogue:refresh` regenerates:

```text
src/generated/catalogue-stats.json
src/generated/search-index.json
src/generated/catalogue-public.json
src/generated/route-manifest.json
public/og/index.svg
public/og/<project>.svg
public/og/collection-<collection>.svg
```

`npm run generated:check` performs the same derivation in check-only mode and fails when tracked generated files are stale.

The public `/catalogue.json` endpoint is backed by `catalogue-public.json`. `/sitemap.xml` is backed by `route-manifest.json`. Search consumes `search-index.json` directly.

## Repository discovery

```bash
npm run projects:discover
```

Discovery compares public repositories owned by `thiepn` against project records and writes `src/generated/github-discovery.json`.

Repository topics are hints only:

- `thiepn-hub` → explicit candidate;
- `thiepn-hub-ignore` → intentionally ignored.

Discovery never creates or publishes a project record.

## GitHub metadata sync

```bash
npm run github:sync
```

Optional credentials:

```text
GITHUB_TOKEN
GH_TOKEN
```

Output:

```text
src/generated/github.json
```

The sync retains cached metadata or writes an unavailable/stale record when GitHub cannot be reached. The deploy build runs this enrichment before Astro builds, but failure isolation is part of the script contract.

## Preview capture

```bash
npm run preview:capture -- --slug markdown-guide
npm run preview:capture -- --all
```

Capture is deterministic and poster-first:

- Chromium viewport: 1200×750;
- reduced-motion context;
- page animations/transitions disabled before capture;
- source image written as `public/projects/<slug>/capture-source.png`;
- P1 artifacts are the default capture candidates.

A project can optionally define `previewRoute` when its best deterministic state is not the public landing route.

## Media optimization and audit

Inspect first:

```bash
npm run media:optimize
```

Write derivatives when local ImageMagick/FFmpeg are available:

```bash
npm run media:optimize -- --write
```

Media audit:

```bash
npm run media:validate
```

Budgets:

- optimized poster target: ≤300 KB;
- poster hard limit: 1 MB;
- preview WebM target: ≤1.5 MB;
- preview WebM hard limit: 3 MB.

The validator also catches video records whose declared local source does not exist.

## Link health

Offline/source-safe validation:

```bash
npm run links:validate
```

Networked destination health:

```bash
npm run links:validate -- --online
```

The weekly `Link Health` workflow performs the online check. Link failures are operational signals; they must not cause automation to silently rewrite curated destinations.

## Internal diagnostics

These routes are intentionally excluded from the sitemap and marked `noindex`:

```text
/dev/catalogue/
/dev/design-system/
```

`/dev/catalogue/` exposes record counts, preview tiers, GitHub cache state, and the discovery queue.

`/dev/design-system/` presents production typography, canvas/ink tokens, controls, status labels, and real project apertures together for drift inspection.

## G-010 acceptance fixture

`npm run test:automation` creates an isolated copy of catalogue data and adds a temporary listed game. The fixture must receive `G-010` and automatically appear in:

- the ledger;
- registered/listed counts;
- curated archive order;
- generated search index;
- public catalogue JSON;
- project route manifest / sitemap input;
- generated OG artwork.

The test hashes representative UI source files before and after the operation. Adding the fixture is considered a failure if a UI component must change.

## Phase 10 release gate

```bash
npm run generated:check
npm run validate
npm run test:automation
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

The normal combined command is:

```bash
npm run audit:phase10
```
