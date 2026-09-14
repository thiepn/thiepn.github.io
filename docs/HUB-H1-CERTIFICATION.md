# THIEPN Hub V2 — H1 Foundation Certification

## Locked public Hub

The public Hub is intentionally separate from the historical portfolio catalogue.

- Hub apps: 26
- Hub categories: 6
- Tools: 4
- Create: 4
- Learn: 6
- Faith: 3
- Explore: 2
- Games: 7

The canonical app membership, order, descriptions, categories, badges, and exclusions live in `src/data/hub.json`.

## Explicit Hub exclusions

These projects remain registered in the historical project catalogue but are intentionally excluded from the app Hub:

- `pflegelern`
- `wordfall`
- `curio`
- `nebula-foundry`

## Validation contract

`scripts/validate-hub.mjs` protects the Hub against accidental drift. It verifies:

- exactly 26 Hub apps;
- unique and contiguous order positions 1–26;
- the locked membership and canonical ordering;
- the six allowed Hub categories and their expected counts;
- supported Hub badges;
- a corresponding listed project record for every Hub app;
- a usable HTTPS live URL and preview metadata for every Hub app;
- continued exclusion of the four explicitly removed apps while preserving them in the historical catalogue.

`scripts/validate-catalogue.mjs` invokes the Hub validator, so normal catalogue validation also certifies the Hub contract.

## Catalogue relationship

The project catalogue remains the canonical portfolio/archive dataset. The Hub registry resolves its 26 app entries against those project records rather than duplicating full project metadata.

This allows `/projects/` and `/work/` to retain portfolio-oriented classification while the homepage can use the simpler Hub categories `Tools`, `Create`, `Learn`, `Faith`, `Explore`, and `Games`.

## Generated assets

The generated-catalogue workflow now rasterizes Open Graph cards before running the full catalogue refresh. This keeps SVG/PNG OG derivatives and the raster manifest synchronized whenever public catalogue entries change.

## H1 acceptance criteria

H1 is accepted when the post-refresh repository state passes catalogue/Hub validation, type checking, unit tests, build, and deployment checks. H2 may then replace the existing curated homepage with the 26-app Hub interface.
