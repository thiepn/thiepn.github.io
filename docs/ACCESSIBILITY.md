# THE INDEX — Accessibility Contract

**Target:** WCAG 2.2 Level AA for the public THIEPN. Project Index.

This document defines the permanent accessibility contract for THE INDEX. It applies to the homepage, project archive, Artifact Records, Collection Records, Catalogue Search, dialogs, previews, development-independent navigation, and all future catalogue additions.

## 1. Core principles

1. Semantic HTML is the default. ARIA supplements native semantics; it does not replace them unnecessarily.
2. Every public route has exactly one page-level `h1`, a named `main` landmark, primary navigation, and a descriptive page title.
3. All essential content and external/internal navigation remain available without JavaScript.
4. Keyboard operation is equivalent to pointer operation. Hover may reveal additional presentation, but never exclusive functionality.
5. Motion is enhancement only. `prefers-reduced-motion: reduce` suppresses non-essential movement, autoplay preview behavior, scanner behavior, and smooth scrolling.
6. Browser zoom is unrestricted. Content must reflow without two-dimensional page scrolling at 320 CSS px.
7. Color is never the sole carrier of state. Status, selection, and relationship states retain text, structure, border, underline, or native state semantics.
8. Public normal-size text targets at least 4.5:1 contrast; large text targets at least 3:1. UI boundaries and focus indicators remain perceivable in high-contrast/forced-colors modes.
9. Primary controls target at least 44×44 CSS px where practical, exceeding WCAG 2.2's 24×24 minimum target size requirement.
10. Dialogs use native `<dialog>` semantics with explicit accessible names, Escape behavior, focus containment, and focus restoration.

## 2. Keyboard contract

- The first Tab stop is `Skip to main content`.
- Activating the skip link moves focus to `#main-content`.
- All visible controls are reachable in DOM order.
- Focus indicators use `:focus-visible` and are never intentionally removed without an equivalent replacement.
- Focusable controls receive scroll margin so the sticky header does not obscure focused content.
- Catalogue Search uses Arrow Up/Down while focus stays on the combobox; Enter opens details; Ctrl/Command+Enter may open the external artifact.
- Mobile navigation and Gallery inspection return focus to the exact opener after dismissal.
- Collection relationships are buttons with `aria-pressed`; collection artifact links remain ordinary links rather than pretending to be selected tabs or current pages.

## 3. Search semantics

Catalogue Search follows a combobox/listbox model:

- query field: `role="combobox"`, named by its label;
- result container: `role="listbox"`;
- results: `role="option"` with `aria-selected`;
- active result: identified by `aria-activedescendant` on the combobox;
- a polite live region reports result counts and random-access selection;
- the preview pane is supplemental and does not replace the option's accessible name.

Options are not implemented as buttons with their roles overwritten.

## 4. Dialog contract

The following surfaces are modal dialogs:

- Mobile navigation;
- Catalogue Search;
- Artifact Gallery inspection.

Required behavior:

- explicit accessible label/title;
- native modal focus containment where supported;
- Escape closes;
- visible Close control;
- backdrop/pointer dismissal where implemented;
- focus returns to the opener;
- background page scrolling is suppressed while a dialog is open;
- no dialog is required for essential no-JavaScript navigation.

## 5. Motion and previews

Under reduced motion:

- hero choreography is suppressed;
- Living Index proximity movement and scanner are suppressed;
- section reveal translations are suppressed;
- archive FLIP movement is suppressed;
- preview media never needs to activate for content comprehension;
- static project-specific posters remain visible.

No essential action depends on dragging, pointer velocity, or proximity.

## 6. Reflow, zoom, and text spacing

Certification covers:

- 320×568;
- 360×800;
- 390×844;
- 430×932;
- 640×900 (approximately a 1280px layout at 200% zoom);
- tablet and desktop reference sizes through 2560×1440.

The page must not produce horizontal document scrolling at 320 CSS px. Components that genuinely contain spatial diagrams collapse to linear mobile sequences instead of forcing horizontal panning.

Text-spacing stress uses WCAG-style overrides for line height, paragraph spacing, letter spacing, and word spacing and must not clip or hide content.

## 7. Color and contrast

Core foreground tokens are audited against all first-party surface tokens, not only the root canvas. Project accent colors that are used as small text are audited against the theme canvas.

`forced-colors: active` removes non-essential clipping/decorative effects where needed and restores system colors/borders/focus indicators.

## 8. No-JavaScript baseline

With JavaScript disabled:

- homepage identity and project discovery remain readable;
- `/projects/` exposes the complete public catalogue;
- project and collection record routes remain navigable;
- header Search remains a normal link to `/projects/`;
- mobile navigation exposes a `<noscript>` direct-navigation fallback;
- previews remain static;
- filtering/search enhancements disappear rather than leaving broken controls.

## 9. Certification browsers

Automated Phase 12 coverage uses Playwright against:

- Chromium desktop;
- Firefox desktop;
- WebKit desktop;
- touch/mobile Chromium;
- touch/mobile WebKit.

Forced-colors emulation is automated in Chromium; the cross-browser CSS fallback is additionally source-audited.

Automated accessibility-tree assertions use Playwright ARIA snapshots and role/name/state assertions. These verify browser accessibility semantics but do not claim to replace a manual pass with every real screen-reader/browser pairing.

## 10. Release-blocking severity

**Critical / High — must fix before release**

- essential task impossible by keyboard;
- focus trapped or lost outside intended modal behavior;
- missing accessible name on essential control;
- loss of content/function at 320 CSS px;
- zoom disabled;
- essential no-JS navigation broken;
- normal text below AA contrast in first-party presentation;
- reduced-motion preference ignored for substantial non-essential movement.

**Medium — fix before release candidate when reproducible**

- non-essential focus order inefficiency;
- confusing live-region announcement;
- target-size inconsistency outside inline-text exceptions;
- browser-specific cosmetic degradation that does not lose content/function.

## 11. Permanent commands

```bash
npm run a11y:source
npm run test:a11y
npm run test:e2e:cert
npm run audit:phase12
```

Phase 12 and later phases must preserve this contract unless a newer written accessibility specification deliberately supersedes it.
