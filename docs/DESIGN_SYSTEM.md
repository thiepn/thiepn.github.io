# THIEPN. / THE LIVING INDEX

## Design System — THE INDEX / DS-01

**Status:** Authoritative  
**Applies to:** All public hub UI, project records, collections, search, navigation, responsive states, motion, previews, and future extensions.

---

## 1. Product identity

THIEPN. is a living catalogue of projects, tools, games, learning systems, resources, visualizations, and experiments.

The visual concept is **THE LIVING INDEX**:

> A precise technical/editorial archive that is quiet at rest and becomes alive when explored.

The site should feel closer to a digital museum catalogue, industrial design archive, technical publication, and creative workshop than to a SaaS dashboard, GitHub profile, app store, gaming portal, or conventional developer portfolio.

The projects supply personality. The hub supplies structure.

### Core attributes

1. **Precise** — measured spacing, deliberate alignment, structural rules, catalogue numbering.
2. **Curious** — projects reveal themselves through useful interaction and previews.
3. **Crafted** — custom component anatomy, typography, and motion rather than library defaults.
4. **Neutral** — graphite/paper hub chrome lets individual projects remain visually distinct.
5. **Alive** — movement communicates state, navigation, or project behavior rather than decorating empty space.

---

## 2. Non-negotiable visual language

Every future component must preserve these traits:

- immutable catalogue codes such as `T-001`, `L-004`, `G-003`;
- numbered sections such as `01 / FEATURED WORK`;
- structural rules and strong alignment;
- small radii;
- selectively clipped Artifact corners;
- registration marks/crosshairs used sparingly;
- Instrument Sans for primary interface/editorial text;
- IBM Plex Mono for metadata, status, codes, dates, and technical labels;
- warm paper light mode;
- neutral graphite dark mode;
- project-specific accents used sparingly outside previews;
- project previews treated as apertures into another visual world;
- measured mechanical motion;
- editorial asymmetry on curated and Featured layouts;
- concise, factual copy rather than marketing language.

### Boundary rule

> **Outside the aperture = THIEPN. Inside the aperture = the project.**

Projects may retain their own typography, colors, motion, artwork, and visual language inside preview apertures. They may not redefine the hub's outer geometry, typography, spacing, navigation, or control language.

---

## 3. Explicitly prohibited patterns

Do not introduce any of the following as general hub styling:

- giant rounded cards;
- `border-radius: 20–30px` everywhere;
- purple/blue glowing gradients;
- generic glassmorphism;
- blurred floating blobs;
- gradient heading text;
- pill-heavy tags and filters;
- icons inside colored circles as a default pattern;
- generic dashboard metric cards;
- large soft shadows on every card;
- mouse-following glow everywhere;
- dramatic 3D card tilt;
- bounce/spring motion as the default interaction language;
- generic bento layouts used because they are fashionable;
- generic command-palette styling;
- neon cyberpunk hub chrome;
- SaaS-style hero CTA clusters;
- huge empty hero sections;
- emoji-based UI decoration;
- visible component-library aesthetics from Bootstrap, Material UI, shadcn defaults, Chakra, Mantine, DaisyUI, Flowbite, or similar.

### Anti-generic test

For every new surface ask:

> Could this appear unchanged in a generic AI-generated SaaS dashboard?

If yes, redesign it within THE INDEX language.

---

## 4. Geometry

### Radius tokens

```css
--radius-0: 0;
--radius-xs: 2px;
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
```

Normal Artifact Plates use `4–8px`. Large feature panels may use `12px` maximum.

### Artifact cut

```css
--artifact-cut: 12px;
--artifact-cut-mobile: 8px;
--artifact-cut-feature: 16px;
```

Use the lower-right clipped corner selectively on Artifact Plates, selection surfaces, and Featured compositions. Do not clip every container.

### Borders

```css
--border-hairline: 1px;
--border-active: 2px;
--border-accent: 3px;
```

Prefer rules and borders over shadow-based floating surfaces.

### Shadows

Normal cards use no shadow. Elevated surfaces such as Catalogue Search or full-screen image inspection may use a restrained shadow:

```css
--shadow-soft:
  0 1px 0 rgba(255,255,255,.04),
  0 12px 36px rgba(0,0,0,.08);
```

---

## 5. Color system

### Light — technical paper

```css
:root {
  --canvas: #ECEAE3;
  --canvas-raised: #F2F0E9;
  --surface-1: #F8F6F0;
  --surface-2: #FFFEFA;
  --surface-3: #E4E1D8;

  --ink: #151613;
  --ink-secondary: #555650;
  --ink-muted: #80817A;
  --ink-disabled: #A9AAA4;

  --line-soft: #DDDAD1;
  --line: #D0CDC4;
  --line-strong: #AAA79E;

  --selection: rgba(21,22,19,.10);
}
```

### Dark — graphite

```css
[data-theme="dark"] {
  --canvas: #0B0C0C;
  --canvas-raised: #101111;
  --surface-1: #141515;
  --surface-2: #191A1A;
  --surface-3: #202120;

  --ink: #F0EEE8;
  --ink-secondary: #AAA8A2;
  --ink-muted: #757570;
  --ink-disabled: #4D4E4B;

  --line-soft: #202120;
  --line: #2B2C2B;
  --line-strong: #484945;

  --selection: rgba(240,238,232,.12);
}
```

Avoid blue-black dark mode and sterile pure-white light mode.

### Project accent policy

Each project supplies curated `accentLight` and `accentDark` values.

Outside its aperture, accent may control:

- one structural line;
- catalogue code emphasis;
- active selection marker;
- focus state where contrast permits;
- small preview state/registration details.

Accent should occupy roughly **5–12%** of normal hub chrome and at most roughly **15%** of an Artifact Record. Inside the preview aperture, project color is unrestricted.

Do not recolor entire cards with project accents.

---

## 6. Typography

### Families

```css
--font-ui: "Instrument Sans", system-ui, sans-serif;
--font-meta: "IBM Plex Mono", ui-monospace, monospace;
```

Fonts should be self-hosted as WOFF2 where practical and use `font-display: swap`.

No third general-purpose site font.

### Scale

```css
--text-display-xl: clamp(4.6rem, 10vw, 10rem);
--text-display-l: clamp(3.4rem, 7vw, 7.4rem);
--text-display-m: clamp(2.4rem, 4.5vw, 4.6rem);
--text-h2: clamp(1.8rem, 3vw, 3rem);
--text-h3: clamp(1.25rem, 2vw, 1.7rem);
--text-body-l: clamp(1.05rem, 1.3vw, 1.2rem);
--text-body: 1rem;
--text-small: .875rem;
--text-meta: .72rem;
```

### Leading

```css
--leading-display: .88;
--leading-heading: 1.05;
--leading-tight: 1.2;
--leading-body: 1.55;
--leading-reading: 1.65;
--leading-meta: 1.3;
```

### Tracking

- Large display: approximately `-0.04em` to `-0.07em`.
- Body: `0`.
- Uppercase mono metadata: approximately `+0.05em` to `+0.09em`.

Controls should normally be at least `14px`; essential text should not fall below `12px`.

Reading copy should usually remain within 55–72 characters per line.

---

## 7. Spacing and grid

### Spacing tokens

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 24px;
--space-6: 32px;
--space-7: 48px;
--space-8: 64px;
--space-9: 96px;
--space-10: 128px;
--space-11: 160px;
```

### Layout

```css
--page-max: 1540px;
```

- Desktop: 12 columns.
- Tablet: 8 columns.
- Mobile: 4 conceptual columns, usually rendered as one-column content.
- Desktop gutters: about 20–24px.
- Mobile gaps: about 12–16px.

Use container queries for reusable Artifact layouts where useful.

### Responsive ranges

- `<480px` compact mobile.
- `480–599px` mobile.
- `600–899px` tablet portrait.
- `900–1199px` tablet landscape / small desktop.
- `1200–1599px` standard desktop.
- `>=1600px` wide editorial layout.

The site must remain usable at 320px without page-level horizontal overflow.

---

## 8. Wordmark and section language

Primary wordmark:

```text
THIEPN.
```

The period is part of the identity.

Canonical homepage section nomenclature:

```text
00 / INDEX
01 / FEATURED WORK
02 / BROWSE BY TYPE
03 / PROJECT ARCHIVE
04 / COLLECTIONS
05 / RECENT ACTIVITY
```

Use editorial/index vocabulary instead of decorative labels.

---

## 9. Navigation grammar

Arrow meanings are fixed:

```text
→   internal THIEPN. navigation
↗   leaves the hub / opens a live artifact or external source
←   back / previous
↓   continue downward
```

Examples:

```text
DETAILS →
COLLECTION →
PLAY ↗
OPEN TOOL ↗
SOURCE ↗
```

Never mix these meanings.

---

## 10. Artifact Plate family

Canonical variants:

1. **Hero Artifact** — strongest 1–2 Featured projects.
2. **Feature Artifact** — medium Featured work.
3. **Standard Artifact** — normal archive grid.
4. **Compact Artifact** — related items, collection subviews, mobile secondary contexts.
5. **Archive Row** — list view, archived projects, very large libraries.

### Standard Artifact anatomy

```text
G-003                                   LIVE
────────────────────────────────────────────

[              PREVIEW APERTURE            ]

────────────────────────────────────────────
CURIO
Objects of Questionable Value

Auction and appraisal strategy game.

GAME / STRATEGY / OFFLINE

DETAILS →                           OPEN ↗
```

Do not wrap metadata into separate cards or pill badges.

### Preview aperture

The aperture is visual project content bounded by structural rules, not a rounded nested card.

```css
aspect-ratio: 16 / 10;
overflow: hidden;
position: relative;
```

Project-specific typography and visuals are allowed inside it.

---

## 11. Preview system

Every preview uses the same lifecycle:

```text
POSTER → ARMED → ACTIVE → SETTLED → POSTER
```

Failure state:

```text
UNAVAILABLE
```

Fine-pointer activation generally occurs after `150–220ms`; expensive media may use approximately `300ms`.

A preview demonstrates one useful interaction, not the full application. Typical duration: 2.8–4.5 seconds, maximum roughly 6 seconds.

No audio.

Offscreen previews and previews in hidden tabs pause/reset. Desktop active-preview limit: 2. Mobile: 1.

### Project-type preview language

- **Games:** real gameplay showing challenge → input/action → consequence.
- **Tools/apps:** simplified synthetic workflow showing input → action → result.
- **Learning:** prompt/concept → interaction → feedback → next state.
- **PDF/resources:** cover/page-stack/editorial artifact behavior.
- **Visualizations:** visualization itself dominates; controls remain minimal.
- **Experiments:** may expose raw/debug/prototype qualities intentionally.
- **Archived:** static/desaturated; no active preview required.

---

## 12. Homepage signature — The Living Index

The hero contains 6–9 curated miniature project fragments rather than all projects.

At rest they are restrained, partially desaturated, and low contrast. Pointer proximity activates the nearest fragments; deliberate hover/focus fully wakes one fragment, reveals its identity, and may begin a miniature preview.

The system should feel like examining an archive, not floating cards chasing the cursor.

### Desktop

- Fine-pointer proximity radius around 220px.
- Nearest fragment receives strongest activation.
- Movement should remain tiny, around 0–2px.
- No fragment may obstruct important text or controls.

### Mobile

No pointer system. Use a simplified static composition with at most one quiet periodic wake every 3–4 seconds, disabled under reduced motion.

### Optional scanner

A very faint technical scan line may be feature-flagged on desktop. It must be trivial to disable if testing shows it feels gimmicky.

---

## 13. Motion language — Measured Mechanics

Movement should resemble:

- line drawing;
- sliding plates;
- aperture activation;
- index reorganization;
- registration alignment;
- controlled reveals.

It should not resemble:

- bouncing;
- floating blobs;
- dramatic parallax;
- exaggerated magnetic movement;
- decorative spring physics.

### Timing

```css
--motion-instant: 80ms;
--motion-fast: 140ms;
--motion-standard: 220ms;
--motion-layout: 320ms;
--motion-page: 440ms;
--motion-demo: 3200ms;
```

### Easing

```css
--ease-standard: cubic-bezier(.22,.61,.36,1);
--ease-enter: cubic-bezier(.16,1,.3,1);
--ease-exit: cubic-bezier(.7,0,.84,0);
```

### Technology hierarchy

1. CSS for simple hover/focus/line/color transitions.
2. Motion for coordinated layout, sequence, SVG, and proximity interactions.
3. Native View Transitions as progressive enhancement where appropriate.
4. WebM for genuine gameplay or complex real behavior.

No scroll hijacking or fake scrolling.

---

## 14. Catalogue Search

Catalogue Search is a signature archive-query interface, not a generic rounded command palette.

Desktop concept:

```text
SEARCH / THE INDEX                                      ESC
────────────────────────────────────────────────────────────

> french_

────────────────────────────────────────────────────────────
L-001   FRENCH 3000                         LEARNING
        Vocabulary and spaced repetition
...
────────────────────────────────────────────────────────────
↑↓ SELECT   ENTER DETAILS   CMD+ENTER OPEN   R RANDOM
```

Rules:

- large input;
- neutral technical surface;
- structural rules;
- selected result uses a thin project-accent marker;
- background remains faintly visible rather than aggressively blurred;
- full-screen on mobile;
- `Cmd/Ctrl+K` and `/` open it;
- Enter opens Artifact Record; `Cmd/Ctrl+Enter` opens live artifact;
- `Esc` closes and restores focus.

---

## 15. Collections

Collections are editorial relationships, not saved category filters.

Use composed relationship diagrams for small collections and anchor-project + full-index layouts for larger collections.

Do not use physics or force-directed graphs.

Mobile collections simplify to a vertical connected sequence.

---

## 16. Artifact Records

Artifact Records should feel like detailed accession records, not marketing landing pages.

Typical structure:

```text
00 / ARTIFACT HERO
01 / OVERVIEW
02 / CAPABILITIES or CORE SYSTEMS / LEARNING MODES
03 / GALLERY
04 / RECORD
05 / RELATED ARTIFACTS
```

Not every project requires every section.

Metadata is shown as rows rather than metric cards.

Gallery uses `FIG. 01`, `FIG. 02`, etc. Full-screen inspection follows THE INDEX geometry rather than a generic lightbox.

---

## 17. Iconography

Icons are secondary to typography and structural marks.

- Custom category glyphs should use a 16×16 or 20×20 geometric grid.
- Stroke around 1.5px.
- No decorative emoji.
- No standard icon-inside-colored-circle pattern.
- Prefer literal `MENU` on mobile rather than relying only on a hamburger glyph.

---

## 18. Themes

Public choices:

```text
SYSTEM
LIGHT
DARK
```

No novelty theme collection.

Explicit user choice persists locally. `SYSTEM` tracks OS changes.

Theme initialization must happen before meaningful paint to avoid a wrong-theme flash.

Theme transition: roughly 180–240ms, disabled under reduced motion.

---

## 19. Accessibility rules

Required:

- semantic HTML and landmarks;
- exactly one logical page `<h1>`;
- real anchors/buttons instead of clickable `<div>` elements;
- visible `:focus-visible` states;
- keyboard-complete navigation;
- skip link: `SKIP TO PROJECT INDEX`;
- no color-only state communication;
- primary touch targets around 44×44px;
- no disabled pinch zoom;
- 200% browser zoom remains usable;
- reduced-motion support;
- appropriate focus trapping/restoration for Catalogue Search and image inspection;
- forced-colors resilience;
- meaningful gallery alt text;
- decorative card posters may use empty alt when the card already fully labels the project.

Target WCAG AA minimum contrast, preferably stronger.

Hover enhancements must be gated through `(hover: hover) and (pointer: fine)` and may never contain essential information.

---

## 20. Performance rules that affect design

- No live project iframes in archive grids.
- Posters load before preview media.
- Preview videos are lazy and interaction-triggered.
- Explicit dimensions/aspect ratio prevent CLS.
- Prefer AVIF/WebP images and WebM previews.
- No GIF previews.
- No service worker in V1.
- No Three.js/WebGL in V1.

Preferred Web Vitals goals:

```text
LCP <= 2.0s preferred, <= 2.5s acceptance
INP <= 150ms preferred, <= 200ms acceptance
CLS <= 0.05 preferred, <= 0.1 acceptance
```

---

## 21. Responsive identity rules

Mobile must not become a generic separate app.

Preserve on all breakpoints:

- catalogue codes;
- structural rules;
- clipped geometry;
- aperture previews;
- mono metadata;
- typography hierarchy;
- neutral frame/project-specific content separation.

Do not add a generic mobile bottom navigation bar.

At `<600px`:

- archive becomes one column;
- search becomes full-screen;
- pointer scanner/proximity effects are disabled;
- Artifact Record hero stacks vertically;
- complex collection maps simplify;
- video does not autoplay by default.

---

## 22. Copy language

Copy is direct, concise, and factual.

Good:

> Browser-based PDF workspace for editing, organizing, and transforming documents.

Bad:

> Revolutionize your workflow with this powerful next-generation all-in-one solution.

Avoid generic marketing language such as `powerful`, `revolutionary`, `cutting-edge`, `seamless`, `immersive`, or `next-generation` unless literally necessary.

Project subtitles should be specific rather than repeated generic phrases.

---

## 23. QA gates

Before release, minimum design scores:

| Area | Minimum |
|---|---:|
| Identity | 9/10 |
| Typography | 9/10 |
| Layout | 9/10 |
| Mobile | 9/10 |
| Project differentiation | 9/10 |
| Navigation clarity | 9/10 |
| Motion quality | 8.5/10 |
| Accessibility | 9/10 |
| Performance | 9/10 |
| Consistency | 9/10 |

Mandatory viewport review:

```text
320×568
360×800
390×844
430×932
768×1024
1024×768
1280×800
1366×768
1440×900
1920×1080
2560×1440
```

### Gold-standard tests

THE INDEX must remain recognizable when:

- project accents are removed;
- animation is disabled;
- project posters are temporarily grayscale;
- the archive grows past 100 projects;
- viewed on a small phone.

---

## 24. Permanent implementation invariant

Every AI-assisted implementation task must preserve the following:

> **Preserve THE INDEX design system. Do not replace its editorial/archive visual language with generic SaaS/dashboard styling. Maintain small radii, structural rules, catalogue codes, clipped Artifact geometry, Instrument Sans + IBM Plex Mono typography, neutral paper/graphite surfaces, restrained project accents, project-specific aperture content, measured mechanical motion, and the internal `→` / external `↗` navigation grammar. When implementation difficulty arises, simplify within THE INDEX rather than substituting a familiar generic UI pattern.**

This file is authoritative. A future implementation that contradicts it is a design regression unless the design system itself is deliberately versioned and revised.
