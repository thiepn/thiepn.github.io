# THIEPN — A digital workshop by Jonathan

The production source for **thiepn.dev**, built with Astro and static content.

## September 2026 redesign

The public site is now an editorial showcase, not an interface to its catalogue schema.
**Work / Library / About** are the primary destinations. The homepage leads directly into Micro Arcade,
then presents contrasting tools, games and a bridge to the separately deployed Library.
The complete archive remains at `/projects/`; all `/project/` and `/collection/` URLs remain valid.

This redesign supersedes earlier instructions to preserve THE INDEX / DS-01, catalogue-code labels,
“flagship” UI, redundant classification sections and motion choreography. Historical documentation
remains as a record, not as the governing public-interface contract.

## Run and verify

```sh
npm ci
npm run dev
npm run generated:check
npm run validate
npm run typecheck
npm test
npm run build
npm run perf:budget
npm install --prefix /tmp/audit-tools axe-core@4.13.0
npx playwright install --with-deps chromium firefox webkit
npm run test:e2e
```

`npm run audit:studio` is the current release gate. It retains catalogue validation, canonical URL
invariants, media/link validation, unit tests and built payload budgets. The new Playwright suite covers
routes, images, keyboard navigation, mobile menus, search failure recovery, filters/history,
JavaScript-disabled navigation, themes, reflow/text spacing and axe checks across three engines.
The retired UI's tests and validators remain available as `test:e2e:historical` and `validate:historical`;
they intentionally are not the release contract for a different interface.

## Adding work

1. Add a validated project record in `src/content/projects/` using the existing `project:add` tooling.
2. Keep it on hold until its launch URL, status and basic workflow have been checked.
3. Add genuine captures under `public/projects/<slug>/`. Do not substitute invented UI for a screenshot.
4. To curate a project, add its presentation and placement to `src/data/showcase.json`.
5. Run the current release gate. Adding archive projects never requires a custom page.

`prepare-showcase.mjs` copies checked-in captures into an ignored Astro asset input directory.
Astro generates responsive WebP sizes from those source images; generated assets are not committed.
No runtime framework or autoplay media is required to browse the site.

## Architecture

- `src/data/showcase.json`: selected-work order, concise copy, source media and project-specific tone.
- `src/components/studio/`: shared exhibits and responsive media.
- `src/styles/studio.css`: the current visual system.
- `src/pages/work/`: curated exploration; `/projects/`: complete, progressively enhanced archive.
- `src/pages/project/`: shared project-story template with optional gallery and technical details.
- `src/scripts/simple-archive.ts`: static-row search, filters, sorting and URL history.
- `src/scripts/catalogue-search*`: on-demand accessible search and network-failure recovery.
- Existing ledger, public catalogue, search generation, canonical launch URLs and privacy guards remain.

The Library is a separate application at `/library/`. The portfolio must not publish an independently
maintained book inventory from stale root-repository records. `/books/` is a compatibility gateway.
Root-preview tests proxy the actual Library cover assets; they do not mock project interfaces.

See [the redesign specification](docs/STUDIO_REDESIGN.md). The historical launch manifest remains intact.

## Social-image regeneration

After changing a project subtitle, title or accent, run `npx playwright install chromium`, then `node scripts/rasterize-og.mjs` and `npm run catalogue:refresh`. Commit the updated `public/og` images and `src/generated` records. The build deliberately rejects stale social-image derivatives rather than sharing outdated content.

## Interactive showcase

Tiny Tools has a dedicated homepage feature, four direct task routes, a local whitespace-cleaner miniature and a complete project page. Micro Arcade uses genuine, keyboard-operable game previews with an opt-in recording. Source-linked build notes document three projects without invented outcomes or contribution claims. See [showcase maintenance and verification](docs/showcase/README.md) for content, media and lifecycle contracts.
