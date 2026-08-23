# P4 — Project Pages & Preview Experience

P4 reconstructs `/project/[slug]/` as the examination layer of **THE INDEX**. It preserves the existing data model and project-specific PreviewAperture scenes while making project records easier to navigate, inspect, and understand on pointer, keyboard, and touch interfaces.

## Experience contract

### 1. Project identity remains primary

The record hero must read as a project record, not a generic product landing page. Catalogue code, status, title, subtitle, summary, primary destination, repository link, and the project preview remain in one coherent opening composition.

No dashboard cards, floating controls, decorative metrics, fake screenshots, embedded copies of projects, or SaaS-style CTA clusters are introduced.

### 2. The preview is an inspection window

The large project preview is labelled as an **Inspection window** with an explicit state readout. Its default label is derived from the real preview type and is retained by the controller instead of being overwritten with a generic fallback.

Capability rows with a `previewState` support two interaction modes:

- **Temporary inspection** — pointer hover or keyboard focus previews a state without changing the user's persistent selection.
- **Persistent inspection** — click/touch selects that state, exposes `aria-pressed="true"`, marks the row as selected, and holds the corresponding preview after pointer/focus leaves.

Selecting the active row again returns to the real primary preview.

The first click must survive the lazy-controller boundary. `runtime-loader.ts` records selection intent and replays it through `selectRecordPreviewFromTarget()` if the interaction arrives before the record controller finishes importing.

### 3. Capability language describes the real action

Capability controls use **Inspect →**, not `Preview ↗`. They do not open a new destination, so an external/open arrow would be false affordance. The selected row reports **Selected** visibly while `aria-pressed` exposes the same state semantically.

Static capabilities remain non-interactive references.

### 4. Long records have a compact internal index

Every project record exposes a small `Record index` after the hero. It links only to sections that actually exist:

- Overview
- Capabilities / Core Systems / Learning Modes
- Details
- Views, when a gallery exists
- Related, when related projects exist

This is an orientation aid, not a sticky secondary navigation system.

### 5. Gallery inspection is sequential

Featured project galleries retain their native `<dialog>` inspector and project-specific PreviewAperture scenes. P4 adds:

- explicit view position (`01 / 03`)
- Previous / Next controls
- Left / Right arrow-key traversal
- disabled boundary controls rather than wraparound surprises
- persistent caption and view label
- focus restoration to the original gallery figure on close

Gallery launchers expose an `Inspect ↗` cue continuously at restrained opacity so the action is not hover-only.

### 6. Accessibility and motion

- Capability selection is available by click/touch and keyboard activation.
- `aria-pressed` mirrors persistent preview state.
- Preview state text is exposed through a polite live region.
- Gallery remains a native modal dialog with Escape behavior supplied by the platform.
- Gallery Previous/Next controls are normal buttons.
- Focus restoration is preserved.
- The record remains reflow-safe at 320px.
- Reduced motion removes transition choreography without removing state feedback.
- Forced-colors mode retains selected-state visibility.

## Non-goals

P4 does not rewrite catalogue facts, add new projects, invent galleries for non-featured records, restructure collections, or change preview activation timing. Those concerns belong to later reconstruction phases or to the already-certified preview lifecycle.

## Certification

P4 adds `tests/e2e/reconstruction-p4.spec.ts` and a dedicated Chromium + WebKit smoke step before the exhaustive browser/accessibility matrix. The retained Phase 8 validator is extended to certify the P4 inspection contract at source level.

Merge condition remains unchanged: **Quality**, **Phase 15 Recovery Certification**, and **Release Candidate** must pass on the same PR head.
