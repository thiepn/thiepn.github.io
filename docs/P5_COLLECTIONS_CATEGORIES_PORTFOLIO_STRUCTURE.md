# P5 — Collections / Categories / Portfolio Structure

## Purpose

P5 makes the portfolio hierarchy explicit without adding another taxonomy.

The locked model is:

- **Category** — exactly one classification for each project, describing what the project is.
- **Collection** — zero or more editorial groupings for each project, describing themes, subjects, audiences, or uses that may overlap.
- **Project** — the canonical record. Collection membership never changes the project's category.

This preserves the existing six project categories and existing collection records rather than inventing tags, folders, or parallel classification systems.

## Project directory

`/projects/` now explains both browse systems before the category index:

1. Categories → singular project type.
2. Collections → overlapping editorial themes.

The page remains the canonical complete project directory and retains the existing search/filter/sort/view archive.

## Collections directory

`/collections/` reciprocates the same two-part model. It identifies Collections as editorial groupings, links back to the Category view, exposes the number of collection placements, and keeps every existing collection directly navigable.

## Project records

Project pages include a `Classification` entry in the Record Index and a dedicated `PortfolioClassification` section.

That section:

- links the project's one category back to the filtered project archive;
- lists every editorial collection containing the project;
- explains that collection membership may overlap;
- remains fully usable without JavaScript.

## Collection records

Collection pages now include a compact Collection Index and a `Collection, not category` section before the editorial description.

The section:

- identifies the record as an editorial grouping;
- states that collection membership does not replace project category;
- derives the category mix from the canonical contained projects;
- links each represented category to the filtered project archive;
- links back to both `/projects/` and `/collections/`.

The existing featured-project, complete-directory, relationship-map, and search behavior remains intact.

## Accessibility and responsive behavior

P5 adds only semantic links and navigation landmarks. It does not depend on JavaScript for classification navigation.

The new structures:

- use direct anchors and standard links;
- preserve visible keyboard focus from the global design system;
- avoid hover-only information;
- reflow to a single column on narrow screens;
- maintain the 320 CSS-pixel no-horizontal-overflow contract.

## Certification contract

P5 is guarded by:

- the extended `scripts/validate-phase9.mjs` source contract;
- `tests/e2e/reconstruction-p5.spec.ts` in Chromium and WebKit;
- all retained P2, P3, P4, historical, accessibility, recovery, and release-candidate gates.

P5 may merge only when Quality, Phase 15 Recovery Certification, and Release Candidate are all green on the exact same branch head.
