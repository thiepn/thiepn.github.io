# P3 — Interaction & Motion Reconstruction

## Status

Implementation candidate. Merge only after Quality, Phase 15 Recovery Certification, and Release Candidate all pass on the same head.

## Goal

Reconstruct the portfolio's interaction language around the authoritative **Measured Mechanics** design system: quiet at rest, precise when explored, and never animated for decoration alone.

## Rules

- Motion communicates state, hierarchy, navigation, or project behavior.
- Hub chrome does not lift, bounce, tilt, glow, spring, or chase the pointer.
- Internal `→` cues may advance horizontally by only a few pixels.
- External `↗` cues may advance diagonally by only a few pixels.
- Project cards remain geometrically stable; active state is expressed by rules, border contrast, and the project accent registration edge.
- Stronger motion stays inside explicit project preview apertures.
- Reduced-motion users receive the same information and interaction state without meaningful animation.
- Native dialog semantics, Escape handling, focus trapping, focus restoration, and no-JS fallbacks remain authoritative over animation.

## Reconstruction

### Shared interaction grammar

`src/styles/motion.css` now owns common timing and state feedback for structural controls, navigation, artifact plates, archive rows, Catalogue Search, and mobile navigation.

### Homepage entrance

The homepage no longer relies on broad 9–12px translations or fragment scaling. Editorial elements settle by 2–6px with shorter stagger windows.

### Section reveals

Sections reveal with a restrained 6px translation and low-contrast opacity transition. Each section still reveals once and remains static afterward.

### Archive reflow

FLIP reorganization remains, but newly exposed entries no longer scale. They enter with a short opacity + 4px mechanical settle.

### Header and actions

Desktop navigation uses line-drawing feedback. Artifact action arrows move independently from their labels so interaction does not move surrounding layout.

### Dialogs

Catalogue Search enters as a short vertical plate settle. Mobile navigation enters as one lateral plate. Closing remains immediate so native dialog focus restoration stays deterministic across browsers.

## Certification

`tests/e2e/reconstruction-p3.spec.ts` certifies:

1. normal homepage motion initialization;
2. directional artifact action feedback without layout movement;
3. Catalogue Search plate entrance and selection marker;
4. mobile navigation plate entrance without page-chrome movement;
5. reduced-motion static behavior.

The Quality workflow runs this P3 smoke suite in Chromium and WebKit before the complete cross-browser/accessibility matrix.
