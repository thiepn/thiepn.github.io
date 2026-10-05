# Platform P8 — Hub Product Registry v2

P8 replaces the ecosystem's mental model of "every app is a first-class product" with a bounded product-family registry while preserving every existing legacy identifier.

## Frozen first-class products

The v2 registry contains nine product families:

1. `hub`
2. `folio`
3. `bible`
4. `games`
5. `study`
6. `diet`
7. `french`
8. `pdf`
9. `orrery`

The design intentionally stays well below the 30-product upper bound. New features should normally become modules or capabilities inside one of these products rather than automatically becoming another top-level Hub product.

## Identity model

Canonical v2 identity is:

`product/module`

Examples:

- `folio/knowledge`
- `folio/library`
- `folio/write`
- `folio/notes`
- `bible/tms60`
- `bible/devotion`
- `study/math`
- `diet/copilot`
- `pdf/studio`

Legacy IDs remain accepted as resolve-only aliases. They are not renamed in storage, deleted from Core, or silently rewritten.

Frozen compatibility mappings include:

| Legacy ID | Canonical v2 identity |
| --- | --- |
| `knowledge` | `folio/knowledge` |
| `library` | `folio/library` |
| `manuscript` | `folio/write` |
| `notes` | `folio/notes` |
| `tms60` | `bible/tms60` |
| `mdd` | `bible/devotion` |

Additional aliases cover the current Core registry and historical Hub-facing IDs.

## Ownership boundary

P8 does not centralize product data or runtime logic.

- **Hub** owns public product discovery, navigation, the public registry projection, and compatibility resolution for Hub surfaces.
- **Core** remains authoritative for backend app IDs, namespaces, authorization boundaries, and the legacy `registry/apps.json` contract.
- **Products** continue to own their product-specific UI, logic, data models, and server workloads.
- **Supabase** remains identity/data/RLS/Realtime authority where applicable.
- **Vercel** remains product-family server compute, not a central application backend.
- **GitHub** remains source/CI/release authority.

## Hub implementation

P8 adds:

- `src/data/products-v2.json` — public product-family registry projection.
- `src/types/product-registry.ts` — typed contract.
- `src/lib/product-registry.ts` — product/module lookup and legacy alias resolution.
- `src/pages/products.json.ts` — public machine-readable registry endpoint.
- `scripts/validate-product-registry-v2.mjs` — structural and frozen-mapping validation.
- `tests/unit/product-registry-v2.test.ts` — resolver and compatibility tests.

The current `src/data/hub.json` catalogue is deliberately retained during P8. Existing project URLs, cards, workflows, deep links, and integrations therefore do not change in this phase.

## Core compatibility implementation

The paired `thiepn/core` change adds:

- `registry/products.v2.json`
- `productRegistryV2Schema`
- validation that every active legacy Core app ID resolves into v2
- tests that reject unknown targets, duplicate product IDs, and missing compatibility aliases

The legacy `registry/apps.json` remains present and authoritative for backend compatibility.

## Migration rule

A later phase may migrate individual Hub surfaces to use product families. That migration must resolve legacy IDs through the v2 alias table rather than changing stored IDs in place.

No legacy identifier may be removed until all consumers, namespaces, persisted records, deep links, and operational tooling have been explicitly migrated and certified.
