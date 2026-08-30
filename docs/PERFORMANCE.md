# Performance and Scale Contract

This document defines the performance invariants for THE INDEX. The executable source of truth is `performance-budgets.json`; CI must fail when measured output exceeds a mandatory budget.

## Mandatory budgets

| Metric | Maximum |
| --- | ---: |
| Initial JavaScript, gzip | 120 KiB |
| Initial CSS, gzip | 60 KiB |
| Useful initial transfer, gzip | 1 MiB |
| Search index, gzip | 150 KiB |
| Single preview video | 3 MiB |
| Local font payload | 180 KiB |
| Search average at 250 projects | 50 ms |
| Search p95 at 250 projects | 50 ms |
| Archive interaction p95 at 250 projects | 50 ms |
| LCP | 2.5 s |
| INP | 200 ms |
| CLS | 0.10 |

Preferred Core Web Vitals targets are stricter: LCP ≤ 2.0 s, INP ≤ 150 ms, and CLS ≤ 0.05.

## Source-level invariants

The Phase 11 source audit protects architectural decisions that keep the catalogue fast as it grows:

- search data is served through the static search-index endpoint rather than embedded into every page;
- search runtime code remains split/on-demand;
- the archive does not server-render duplicate Grid and List trees;
- List view remains lazy;
- preview interactions use delegated event handling;
- long-page content uses render containment;
- preview media must stay under the single-video byte budget;
- fonts are either build-managed or remain under the local font budget.

Run:

```bash
npm run perf:source
```

## Built-output budgets

After a production build, the audit measures representative pages and the generated search index. It fails on excessive initial JavaScript, CSS, useful transfer, eager video sources, inlined search payloads, or an oversized search index.

Run:

```bash
npm run build
npm run perf:budget
```

Representative built pages currently include the homepage, project archive, a project detail page, and a collection page.

## Scale benchmark

The repository carries a deterministic 250-project benchmark because catalogue interaction must remain effectively instant well beyond the current public catalogue size.

Run:

```bash
npm run perf:scale
```

The benchmark must keep average search, p95 search, and p95 archive interaction at or below 50 ms.

## Change policy

Performance budgets are constraints, not targets to consume. A change that approaches a ceiling should be optimized rather than justified by unused headroom.

Do not raise a mandatory budget merely to make CI pass. A budget increase requires an explicit architectural reason, measurement evidence, and documentation of the user-visible tradeoff.

When adding media, animation, search features, fonts, or large catalogue data, run the source audit, production build budget, and scale benchmark before merging.
