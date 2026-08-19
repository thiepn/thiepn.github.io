# Phase 9 — Collections

Phase 9 completes the editorial relationship layer of THE INDEX.

## Delivered

- Six collection records with explicit collection logic, controlled search keywords, and explanatory relationship notes.
- Deterministic editorial relationship maps; no force simulation, dragging, or physics.
- Small collections map every artifact. Collections larger than eight artifacts use selected anchors plus a complete index.
- Browser Games proves the large-set pattern with six mapped anchors and nine indexed artifacts.
- Hover and keyboard focus select map nodes, emphasize connected edges/relationship notes, and switch a project-specific static preview.
- Relationship rows are themselves keyboard-operable and can traverse their paired artifacts.
- Mobile maps collapse into a vertical connected sequence with no hover dependency.
- Collection search now indexes collection logic, keywords, member titles, relationship labels, and relationship notes.
- Collection preview cards surface collection logic and relationship counts rather than decorative generic network diagrams.

## Invariants preserved

- Collection pages remain editorial—not categories or saved filters.
- Project records remain the source of project identity and previews.
- PreviewController is unchanged; Collection Map uses static inspection states only.
- Search remains local/static and serverless.
- No graph library, WebGL, canvas physics, or runtime GitHub dependency was introduced.
- All previous catalogue codes, 20 records, 19 public records, and six collection codes remain unchanged.

## Acceptance target

A collection page must answer: **why do these projects belong together?** The relationship map, editorial note, anchor selection, relationship ledger, and full index must provide information beyond a category filter.
