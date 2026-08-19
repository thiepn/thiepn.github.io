# Phase 7 — Featured Preview Production

Phase 7 upgrades the seven manually curated Featured artifacts from framework proofs into project-specific P4/P5 demonstrations while preserving the Phase 6 `PreviewController` and all earlier fallbacks.

## Production matrix

| Artifact | Tier | Preview | Duration | Demonstrated flow |
|---|---:|---|---:|---|
| T-001 PDF Studio | P5 | synthetic | 3.8s | organize pages → select redaction → apply → export ready |
| T-002 Manuscript | P5 | synthetic | 4.0s | Markdown source → build handoff → resolved publication |
| T-003 Clean30 | P4 | synthetic | 3.6s | three tasks → progressive completion → complete state |
| G-001 WORDSTRIKE | P4 | reconstructed WebM + synthetic fallback | 3.4s | incoming word targets → typing → hit → combo consequence |
| L-001 French 3000 | P4 | synthetic | 3.6s | prompt → reveal/context → Good rating → next card |
| G-006 LiGo Quizabend | P4 | synthetic | 3.9s | question/timer → answer lock → score update |
| L-004 Analysis II Klausurlabor | P4 | synthetic | 4.0s | parameter change → graph response → mathematical result |

## P5 compositions

### PDF Studio

The flagship aperture is no longer a stack of generic PDF rectangles. It depicts a compact editor workspace with:

- application toolbar;
- page thumbnails;
- selected page movement;
- redaction-selection state;
- permanent redaction result;
- local/private status;
- explicit export-ready consequence.

The choreography demonstrates `INPUT → ACTION → RESULT`, not decorative motion.

### Manuscript

The second P5 composition is intentionally different from PDF Studio:

- Markdown/source pane;
- source lines resolving in sequence;
- build handoff through the center channel;
- designed publication pane;
- figure block;
- build progress;
- final output-ready state.

The animation communicates transformation from source material to publishable document.

## P4 compositions

### Clean30

Three concrete tasks complete in order. The progress line advances to 100% and the interface resolves to `COMPLETE`. No confetti or gamified celebration was added.

### French 3000

The card presents a real recall loop: `bonjour` with pronunciation/context, a `Good` rating interaction, then transition to the next card (`prendre`).

### LiGo Quizabend

The preview shows quiz-host flow rather than a generic quiz dashboard: timer reduction, answer B locking, score consequence, and presenter connectivity.

### Analysis II Klausurlabor

A parameter changes from λ=1.25 to λ=1.75, the mathematical curve changes accordingly, a point resolves, and the result row becomes active. This distinguishes it from generic flashcard/study previews.

## WORDSTRIKE media provenance

The Phase 6 22 KB protocol video has been replaced with a 960×600, 3.4-second VP9 WebM built from the actual documented project identity and gameplay rules:

- cyan/magenta WORDSTRIKE visual language;
- whole words as active targets;
- targets approach the central core;
- typed word progress;
- successful target destruction;
- score/combo changes;
- core integrity/HUD context.

The current execution environment cannot resolve `thiepn.github.io`, so it cannot record the deployed build directly. The asset is therefore declared `provenance: reconstructed`, not `captured`. The preview UI shows `DEMO`, never `LIVE`, for reconstructed/synthetic media. A later networked capture can replace the file without changing the controller or Artifact components.

## Preview provenance

Phase 7 introduces controlled provenance metadata:

- `static`
- `synthetic`
- `captured`
- `reconstructed`

This prevents generated or reconstructed visuals from being misrepresented as recordings of a deployed application.

## Controller stability

Phase 7 deliberately does **not** create seven runtime controllers. All projects continue to use the same Phase 6 lifecycle:

`POSTER → ARMED → ACTIVE → SETTLED`

with the same:

- active-preview limit;
- lazy video source assignment;
- offscreen reset;
- hidden-tab reset;
- keyboard path;
- reduced-motion suppression;
- static project-specific fallback.

## Acceptance criteria

Phase 7 source validation requires:

- all seven Featured projects have dedicated, non-generic scenes;
- P5/P4 tiers remain correct;
- each synthetic Featured preview has independent choreography;
- video remains lazy and under media budget;
- reconstructed WORDSTRIKE media is labelled honestly;
- reduced-motion leaves previews in `POSTER`;
- Phase 0–6 validators still pass.

## Deferred runtime certification

`npm install` remains unavailable in the current execution environment because npm registry DNS cannot resolve. Astro/Vitest/Playwright runtime certification therefore remains delegated to a networked runner using:

```bash
npm install
npm run audit:phase7
```
