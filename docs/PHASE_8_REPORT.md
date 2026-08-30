# Phase 8 — Full Artifact Records

Phase 8 turns `/project/[slug]/` from a basic detail route into the complete examination layer of THE INDEX.

## Implemented

- Full record sequence: `01 Overview → 02 Capabilities/Core Systems/Learning Modes → 03 Gallery → 04 Record → 05 Related Artifacts`.
- Every one of the 20 registered artifacts now has structured `capabilities` content with 3–4 meaningful entries.
- Every public record has a two-paragraph editorial overview rather than a one-line project summary.
- The seven Featured artifacts have three-item galleries built from deterministic, project-specific preview states.
- Gallery figures open in a native `<dialog>` inspector with backdrop close, explicit close control, Escape support, and focus restoration.
- Featured capability rows can drive the large hero preview into named inspection states without introducing a second preview controller.
- Record metadata covers catalogue code, status, type, category, first indexed, last major update when known, platforms, mobile support, offline/local-first behavior, preview tier/type, source, and live destination.
- Manual related-artifact relationships remain first priority; controlled collection/category/tag inference fills sparse records to a useful 3–4 related artifacts.
- Curated Previous/Next navigation follows the same archive order used by THE INDEX rather than alphabetical routing.
- Non-featured records remain complete even when a gallery is not editorially justified; they do not receive fake screenshot sections.

## Data-model additions

Project records now support:

```yaml
capabilities:
  - title: Page organization
    description: Reorder, combine, extract, and restructure document pages...
    previewState: organize

gallery:
  - label: Organization
    caption: Page ordering and document structure.
    variant: organize
```

`gallery` remains optional. `capabilities` are required for every registered artifact.

## Interaction model

Capability preview switching is deliberately separate from the shared Phase 6 PreviewController. It only freezes the existing project-specific preview scene into a named state while the capability row is hovered or focused. The normal POSTER → ARMED → ACTIVE → SETTLED lifecycle remains unchanged.

Gallery inspection similarly reuses the static PreviewAperture scene. No iframes, screenshots from unknown sources, or duplicate project implementations are introduced.

## Accessibility

- Capability rows without a preview state are semantic static rows, not disabled fake buttons.
- Rows with preview states are real keyboard-focusable buttons.
- Gallery figures use buttons with descriptive accessible names.
- Native dialog behavior supplies Escape dismissal and modal semantics.
- Close restores focus to the originating figure.
- Related and adjacent navigation use real links.
- The record remains single-column/reflow safe at compact widths.

## Phase 8 acceptance state

Source validation confirms:

- 20/20 project records contain structured capabilities.
- 7/7 Featured records contain three gallery figures.
- 20/20 overviews contain at least two paragraphs.
- Artifact Record component architecture is data-driven.
- Related fallback and curated neighboring logic are present.
- Phase 0/2/3/4/5/6/7 structural regression gates remain intact.

Full Astro/Vitest/Playwright execution still requires dependency installation in a networked runner.

## 2026-08-30 Featured-media certification update

PDF Studio now satisfies the three-view gallery contract using real captured product surfaces rather than synthetic proof media: the deployed Home surface, an opened sample document, and the same sample in the first-class Pages organizer. The Pages capture is taken in the ready state before any page mutation, so it demonstrates real organization controls while preserving the original sample unchanged.

The canonical Featured-media workflow captures these deployed states, includes them in the review artifact, refreshes derived catalogue outputs, and commits media plus generated data together before the normal Quality and deployment gates certify the resulting head.
