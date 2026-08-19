# Phase 12 — Browser & Accessibility Certification

Phase 12 certifies the complete Phase 0–11 product architecture across browser engines, keyboard/touch input, accessibility semantics, reflow, reduced motion, forced colors, dialogs, and no-JavaScript operation. It does not redesign THE INDEX.

## Certification scope

- Chromium / Firefox / WebKit desktop;
- mobile Chromium / mobile WebKit;
- keyboard-only navigation;
- accessibility-tree/ARIA semantics;
- native dialog focus behavior;
- 320 CSS-pixel reflow and 200% zoom-equivalent layouts;
- WCAG-style text-spacing stress;
- reduced-motion behavior;
- forced-colors behavior;
- coarse-pointer/touch behavior;
- no-JavaScript fallback.

## Fixes made during certification

1. Catalogue Search options now use genuine `role="option"` elements rather than overriding button semantics.
2. Collection Map selection no longer misuses `aria-current`; relationship controls expose `aria-pressed`, and preview changes are announced politely.
3. Focusable controls receive scroll margin to protect keyboard focus from the sticky header.
4. Modal surfaces include defensive `showModal()`/`close()` fallbacks while retaining native behavior in supported target browsers.
5. Mobile Catalogue Search now includes a `100vh` fallback before `100dvh`.
6. Muted light/dark text tokens were strengthened so they remain AA-safe across all first-party theme surfaces.
7. Four light project accents that were marginally below 4.5:1 when used as small text were darkened slightly while preserving their visual identity.
8. Historical Phase 11 validation now correctly accepts later phases (`phase >= 11`) instead of blocking Phase 12.
9. Older touch E2E contexts no longer assume Firefox supports the same `isMobile` emulation path as Chromium/WebKit.

## Automated browser matrix

`playwright.config.ts` now defines:

- `chromium`;
- `firefox`;
- `webkit`;
- `mobile-chromium`;
- `mobile-webkit`.

Desktop browser projects run the full E2E regression suite. Mobile projects run the dedicated `@mobile-cert` Phase 12 checks.

Failure artifacts retain traces, screenshots, and video.

## Phase 12 E2E coverage

The dedicated Phase 12 suite verifies:

- landmarks and one-H1 page structure;
- ARIA accessibility-tree snapshots;
- combobox/listbox Catalogue Search semantics;
- search modal keyboard containment and focus restoration;
- Gallery dialog Escape/focus restoration;
- Collection Map announcements and pressed states;
- focused controls not being obscured by the sticky header;
- text-spacing overrides;
- 320px reflow across major routes;
- 44px project target-size policy;
- reduced-motion preview suppression;
- forced-colors visibility/focus;
- complete no-JavaScript catalogue/navigation;
- mobile dialog containment;
- touch/no-hover behavior;
- mobile no-JavaScript navigation.

## Source-level accessibility audit

`scripts/audit-accessibility.mjs` independently checks:

- document language;
- zoom not being disabled;
- skip link;
- focus-visible and sticky-header focus clearance;
- reduced-motion and forced-colors guards;
- core text-token contrast on every first-party surface;
- project accent contrast where accents are used as small text;
- Search option semantics;
- Collection relationship state semantics;
- absence of dragging-only first-party interaction.

## CI

The Quality workflow installs Chromium, Firefox, and WebKit with operating-system dependencies and runs the complete Playwright suite after production build and performance-budget checks.

## Certification boundary

Automated ARIA snapshots verify the accessibility tree exposed by each browser engine. This is a strong regression proxy for screen-reader semantics, but it is not represented as a literal NVDA, JAWS, TalkBack, or VoiceOver hands-on certification unless such a manual assistive-technology pass is actually performed.

## Result

Executed in the current implementation environment:

- Phase 12 accessibility source audit: **PASS**;
- Phase 12 structural validator: **PASS**;
- Phase 0–9 historical source validators: **PASS**;
- Phase 11 performance/scale source validator: **PASS**;
- project/collection frontmatter + workflow YAML parse audit: **PASS**;
- modified runtime TypeScript strict smoke: **PASS**;
- Phase 12 Playwright config/spec TypeScript smoke with local declarations: **PASS**;
- 250-artifact search benchmark: approximately **5.1 ms average / 7.4 ms p95**, archive approximately **0.09 ms p95**.

Core minimum normal-text contrast across all first-party surfaces is now **4.64:1 light / 4.58:1 dark** for the muted token; primary and secondary text are higher.

Full Astro/Vitest/Playwright execution could not run in this environment because `npm install` again timed out while the npm registry remained unreachable. Therefore browser-engine execution is wired and release-blocking in CI, but it is not falsely reported here as having run locally.

When dependencies are available, the complete release gate is:

```bash
npm install
npx playwright install --with-deps chromium firefox webkit
npm run audit:phase12
```
