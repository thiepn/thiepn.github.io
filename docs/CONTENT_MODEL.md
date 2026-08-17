# THIEPN. / THE LIVING INDEX

## Content Model and Catalogue Architecture

**Status:** Authoritative  
**Schema family:** Catalogue v1  
**Purpose:** Define the source of truth for projects, collections, permanent catalogue codes, curation, search metadata, previews, and future catalogue growth.

---

## 1. Core rule

> **Adding a new project must be a content operation, not a UI-development operation.**

Whether the hub contains 20, 50, 150, or 500 projects, adding an ordinary project should require a validated project record and a poster. Everything else must derive from data.

The content system has four authoritative layers:

```text
CATALOGUE LEDGER
Permanent project and collection identities

PROJECT RECORDS
What each artifact is

COLLECTION RECORDS
How artifacts relate

CURATION DATA
How the hub prioritizes and presents them
```

Machine-generated GitHub/search/media data may enrich these layers but must never overwrite curated content.

---

## 2. Directory structure

```text
src/
├── content/
│   ├── projects/
│   │   ├── pdf-studio.md
│   │   ├── manuscript.md
│   │   ├── clean30.md
│   │   └── ...
│   └── collections/
│       ├── french-learning.md
│       ├── mathematics-cs.md
│       └── ...
│
├── data/
│   ├── catalogue-ledger.json
│   ├── taxonomy.ts
│   ├── curation.ts
│   ├── project-relations.ts
│   └── site.ts
│
└── generated/
    ├── github.json
    ├── search-index.json
    ├── catalogue-stats.json
    └── media-manifest.json
```

Rules:

- `content/` and `data/` are human-authoritative.
- `generated/` is machine-owned and safe to rebuild.
- Never manually edit generated data.
- Never let automation rewrite curated titles, descriptions, categories, statuses, accent colors, or relationships.

---

## 3. One project per content file

Do not keep a giant 150-entry `projects.ts` object.

Each project has one content record:

```text
src/content/projects/<slug>.md
```

Example:

```yaml
---
schemaVersion: 1

code: T-001
slug: pdf-studio

title: PDF Studio
subtitle: Browser PDF workspace
aliases:
  - pdf
  - pdf editor
  - browser pdf editor

category: tools
type: tool
status: live
visibility: listed

summary: >
  Edit, organize, annotate, and transform PDFs directly in the browser.

repo: thiepn/pdf
liveUrl: https://thiepn.github.io/pdf/

dateAdded: 2026-08-17
yearAdded: 2026
lastMajorUpdate: 2026-08-17

platforms:
  - desktop
  - mobile
  - tablet

capabilityTags:
  - local-first
  - offline

tags:
  - pdf
  - documents
  - productivity

collections:
  - productivity-creation

accent:
  light: "#176FA6"
  dark: "#55C9FF"

preview:
  tier: P5
  type: synthetic
  component: PdfStudioPreview
  poster: /projects/pdf-studio/poster.webp
  focalPoint: "50% 40%"

actions:
  primaryLabel: Open tool
  source: true

featuredRank: 1
curatedRank: 1
---

PDF Studio is a browser-based workspace for working with PDF documents locally.
```

The Markdown body is optional longer overview copy for the Artifact Record.

---

## 4. Required project fields

Every `visibility: listed` project must provide:

```text
schemaVersion
code
slug
title
subtitle
category
type
status
visibility
summary
repo OR explicit no-repository state
liveUrl OR explicit unavailable state
dateAdded/yearAdded
tags
accent.light
accent.dark
preview.tier
preview.type
```

A build must fail when required fields are missing.

---

## 5. Optional project fields

Use only when relevant:

```text
aliases
longDescription
lastMajorUpdate
platforms
controls
capabilityTags
technologies
capabilities
gallery
collections
related
version
language
CEFR
pageCount
genre
sessionLength
previewRoute
previewState
capture
ogImage
```

Do not force every project into a universal product schema. PDFs should not need game genres; games should not need page counts.

---

## 6. Permanent catalogue codes

Catalogue codes are immutable accession identities.

### Prefixes

| Prefix | Meaning |
|---|---|
| `T-` | Tools |
| `L-` | Learning |
| `G-` | Games |
| `R-` | Resources |
| `V-` | Visualizations |
| `X-` | Experiments |
| `C-` | Collections |

Faith/Bible is a topic and collection dimension, not a separate primary prefix. TMS60 can therefore remain a Learning artifact and The Bible Challenge a Game artifact.

### Permanence

Once assigned:

```text
T-001 = PDF Studio
```

it remains `T-001` if the project is renamed, reordered, archived, rebuilt, or moved to another repository.

Never renumber the archive for cosmetic ordering.

### Retired codes

If a project is permanently removed:

```json
"G-014": "__retired__"
```

Never reuse a retired code.

### Category changes

A code records how an artifact entered the archive, while current `category` describes what it is now. If `X-008` later becomes a full game, it may remain `X-008` while `category: games` changes.

---

## 7. Catalogue ledger

Authoritative file:

```text
src/data/catalogue-ledger.json
```

Example:

```json
{
  "T-001": "pdf-studio",
  "T-002": "manuscript",
  "T-003": "clean30",
  "L-001": "french-3000",
  "G-001": "wordstrike"
}
```

Validation must detect:

- duplicate codes;
- duplicate slugs;
- project code not matching ledger;
- ledger code assigned to a different slug;
- accidental reuse of retired codes.

---

## 8. Primary taxonomy

### Categories

V1 categories are locked to:

```text
tools
learning
games
resources
visualizations
experiments
```

Do not create a new primary category casually. Usually at least 3–5 genuine projects should justify one.

### Types

Controlled values may include:

```text
tool
app
game
study-system
flashcards
quiz
resource
guide
visualization
prototype
```

Category is broad; type is specific.

Example:

```text
French 3000
category: learning
type: flashcards
```

### Public statuses

Only:

```text
live
beta
experiment
archived
```

### Publishing visibility

Separate from status:

```text
listed
hold
hidden
```

- `listed` — appears publicly.
- `hold` — valid candidate but not yet presentable for the hub.
- `hidden` — intentionally excluded.

Status describes the artifact. Visibility describes the hub's publishing decision.

---

## 9. Tags and capabilities

### Topic tags

Tags answer: **What is this about?**

Examples:

```text
french
mathematics
algorithms
bible
typing
pdf
productivity
cleaning
markdown
incremental
quiz
```

Recommended: 2–5 topic tags per project.

Do not allow uncontrolled variants such as `math`, `maths`, and `mathematics` simultaneously. Use canonical `mathematics`; search aliases can recognize the others.

### Capability tags

Keep implementation/capability dimensions separate:

```text
offline
local-first
mobile
touch
keyboard
PWA
```

Do not pollute topical tags with capability metadata.

### Platform values

```text
desktop
mobile
tablet
```

Controls are separate:

```text
keyboard
mouse
touch
```

---

## 10. Curation fields

### Featured rank

Featured status is always manual:

```yaml
featuredRank: 1
```

No field means not Featured.

Do not derive Featured from stars, freshness, readiness score, or GitHub activity.

### Curated rank

```yaml
curatedRank: 12
```

controls the default archive order.

Curated ordering exists to balance quality, concept, and visual rhythm. It should avoid long runs of visually similar projects.

### Internal maturity/readiness

Optional internal field:

```text
showcase
ready
beta-ready
hold
```

or a numerical readiness score may exist internally, but it must not appear publicly.

---

## 11. Initial catalogue ledger

These codes are reserved for the initial public GitHub Pages inventory.

### Tools

| Code | Project | Repository |
|---|---|---|
| `T-001` | PDF Studio | `thiepn/pdf` |
| `T-002` | Manuscript | `thiepn/manuscript` |
| `T-003` | Clean30 | `thiepn/clean30` |

### Learning

| Code | Project | Repository |
|---|---|---|
| `L-001` | French 3000 | `thiepn/french3000` |
| `L-002` | Le Carnet Français | `thiepn/french-a1-a2` |
| `L-003` | Französisch Flashcards | `thiepn/french2.2` |
| `L-004` | Analysis II Klausurlabor | `thiepn/analysis2` |
| `L-005` | Analysis II Lernsystem | `thiepn/analysis2ss` |
| `L-006` | AlgoDat Study System | `thiepn/algodat` |
| `L-007` | TMS60 | `thiepn/tms60` |

### Games

| Code | Project | Repository |
|---|---|---|
| `G-001` | WORDSTRIKE | `thiepn/WORDSTRIKE` |
| `G-002` | Wordfall | `thiepn/wordfall` |
| `G-003` | Curio | `thiepn/curio` |
| `G-004` | Nebula Foundry | `thiepn/nebula` |
| `G-005` | The Bible Challenge | `thiepn/tbc` |
| `G-006` | LiGo Quizabend | `thiepn/ligoquiz` |
| `G-007` | ECHOFRAME: LAST SIGNAL | `thiepn/echoframe` |
| `G-008` | Skyspire | `thiepn/skyspire` |
| `G-009` | Analysis Idle | `thiepn/Analysis-Idle` |

### Resources

| Code | Project | Repository | Initial hub state |
|---|---|---|---|
| `R-001` | Markdown / Markdown Guide | `thiepn/markdown` | `hold` until repackaged |

There are no forced `V-` or `X-` entries. The first genuine project of those types receives `V-001` or `X-001` when it exists.

---

## 12. Initial public states

Baseline classification for the first hub build:

### Live

```text
T-001 PDF Studio
T-002 Manuscript
T-003 Clean30
L-001 French 3000
L-002 Le Carnet Français
L-003 Französisch Flashcards
L-004 Analysis II Klausurlabor
L-005 Analysis II Lernsystem
L-006 AlgoDat Study System
L-007 TMS60
G-001 WORDSTRIKE
G-002 Wordfall
G-003 Curio
G-004 Nebula Foundry
G-005 The Bible Challenge
G-006 LiGo Quizabend
```

### Beta

```text
G-007 ECHOFRAME: LAST SIGNAL
G-008 Skyspire
```

### Experiment

```text
G-009 Analysis Idle
```

### Hold

```text
R-001 Markdown / Markdown Guide
```

These are initial catalogue classifications, not immutable forever. Project codes are permanent; status and visibility may evolve.

---

## 13. Initial Featured ordering

Lock the first Featured composition to:

```text
01  T-001 PDF Studio
02  T-002 Manuscript
03  T-003 Clean30
04  G-001 WORDSTRIKE
05  L-001 French 3000
06  G-006 LiGo Quizabend
07  L-004 Analysis II Klausurlabor
```

Visual roles:

- Hero Artifact: PDF Studio.
- Hero Artifact: Manuscript.
- Feature Artifacts: Clean30, WORDSTRIKE, French 3000.
- Editorial Featured strips: LiGo Quizabend, Analysis II Klausurlabor.

This ordering is intentionally diverse rather than score/date/category sorted.

---

## 14. Collections

Collections answer **Which artifacts meaningfully belong together?** Categories answer **What type of artifact is this?**

Collection records live in:

```text
src/content/collections/<slug>.md
```

### Collection types

```text
persistent
curated
temporary
```

- Persistent: durable conceptual grouping.
- Curated: manually selected theme/use-case grouping.
- Temporary: seasonal or current-state grouping.

### Initial persistent collections

#### C-001 — French Learning

```text
L-001 French 3000
L-002 Le Carnet Français
L-003 Französisch Flashcards
```

#### C-002 — Mathematics & Computer Science

```text
L-004 Analysis II Klausurlabor
L-005 Analysis II Lernsystem
L-006 AlgoDat Study System
G-009 Analysis Idle
```

#### C-003 — Browser Games

```text
G-001 WORDSTRIKE
G-002 Wordfall
G-003 Curio
G-004 Nebula Foundry
G-005 The Bible Challenge
G-006 LiGo Quizabend
G-007 ECHOFRAME: LAST SIGNAL
G-008 Skyspire
G-009 Analysis Idle
```

#### C-004 — Bible & Faith

```text
L-007 TMS60
G-005 The Bible Challenge
```

#### C-005 — Productivity & Creation

```text
T-001 PDF Studio
T-002 Manuscript
T-003 Clean30
```

#### C-006 — Typing Games

```text
G-001 WORDSTRIKE
G-002 Wordfall
```

Do not auto-generate dozens of collection pages from tags. Collections are editorial.

---

## 15. Collection schema

Example:

```yaml
---
schemaVersion: 1
code: C-001
slug: french-learning
title: French Learning
summary: Vocabulary, structured practice, and French-learning systems.
type: persistent

projects:
  - french-3000
  - le-carnet-francais
  - french-flashcards

anchors:
  - french-3000
  - le-carnet-francais

relationships:
  - from: french-3000
    to: le-carnet-francais
    label: vocabulary
  - from: le-carnet-francais
    to: french-flashcards
    label: review
---
```

Relationships are manually composed rather than force-generated.

---

## 16. Search metadata

Every searchable project exposes:

```text
code
title
aliases
summary
category
type
tags
collection names
status
```

Search excludes:

```text
hold
hidden
```

Archived projects may remain searchable unless intentionally excluded.

### Alias examples

PDF Studio:

```text
pdf
pdf editor
document editor
```

Manuscript:

```text
markdown
markdown editor
writing
publishing
```

French 3000:

```text
french vocabulary
vocab
flashcards
SRS
```

LiGo Quizabend:

```text
quiz night
quizabend
community quiz
```

TMS60:

```text
Bible memorization
verse memory
Topical Memory System
```

Aliases improve retrieval but are never rendered as public badges.

---

## 17. Preview metadata

Preview tiers are permanent internal vocabulary:

```text
P0  no visual
P1  automated screenshot
P2  curated poster
P3  synthetic demo
P4  animated real/synthetic preview
P5  custom flagship composition
```

Suggested initial tiers:

| Project | Tier |
|---|---:|
| PDF Studio | P5 |
| Manuscript | P5 |
| Clean30 | P4 |
| WORDSTRIKE | P4 |
| French 3000 | P4 |
| LiGo Quizabend | P4 |
| Analysis II Klausurlabor | P4 |
| Wordfall | P4 |
| Curio | P4 |
| Nebula Foundry | P4 |
| ECHOFRAME | P4 |
| Skyspire | P4 |
| TMS60 | P3 |
| Le Carnet Français | P3 |
| Französisch Flashcards | P3 |
| AlgoDat | P3 |
| Analysis II Lernsystem | P3 |
| The Bible Challenge | P3–P4 |
| Analysis Idle | P3 |
| Markdown | P1 until repackaged |

### Preview schema

```yaml
preview:
  tier: P4
  type: video # video | synthetic | static | auto
  poster: /projects/wordfall/poster.webp
  source: /projects/wordfall/preview.webm
  duration: 4000
  focalPoint: "50% 40%"
```

Synthetic previews may instead specify `component`.

---

## 18. Media structure

```text
public/projects/<slug>/
├── poster-480.avif
├── poster-720.avif
├── poster-1080.avif
├── poster.webp
├── preview.webm
├── gallery-01.avif
├── gallery-02.avif
└── og.webp
```

Use slug-based directories, not catalogue-code filenames.

### Media fallback order

```text
custom flagship composition
> custom video
> curated screenshot
> automated screenshot
> typographic fallback
```

Automation must never overwrite higher-quality manually curated media.

---

## 19. Gallery and capability records

### Gallery

```yaml
gallery:
  - src: /projects/curio/gallery-01.avif
    alt: Auction screen with item dossier and bidding controls.
    caption: Live auction
```

Meaningful gallery images require alt text.

### Capabilities

Use structured records rather than strings:

```yaml
capabilities:
  - id: reorder
    title: Reorder pages
    description: Drag and rearrange PDF pages.
    previewState: reorder
```

This allows capability hover/focus to drive flagship preview states later.

---

## 20. Related artifacts

Manual relationships outrank inferred relationships.

Fallback scoring may use:

```text
same collection          +5
same category            +3
shared topic tag         +2 each
same type                +1
```

Select approximately 3–6 related artifacts.

Avoid monotonous recommendation loops when broader relevant options exist.

---

## 21. GitHub integration boundaries

GitHub enriches the catalogue; it does not control it.

### Always manual/authoritative

```text
code
title
subtitle
category
type
summary/description
status
visibility
tags
collections
accent
featured rank
curated rank
preview type
capabilities
related projects
launch wording
live URL
```

### May be synchronized at build time

```text
repository existence
repository URL
archived state
pushed_at
primary language
repository topics
Pages metadata where available
```

### Runtime rule

The public site should not depend on GitHub API calls. Sync at build time and cache the result. If GitHub is unavailable, build from curated records and cached metadata.

Never scrape live project descriptions and treat them as hub copy.

---

## 22. Counts and derived data

Never manually maintain counts such as:

```text
019 PROJECTS
016 LIVE
```

Derive at build time:

```text
total listed
live
beta
experiment
archived
category counts
collection counts
```

The homepage, archive, category index, and future statistics views must all use the same derived source.

---

## 23. Adding a project

Target command:

```bash
npm run project:add
```

Workflow:

```text
1. Resolve repository/live URL.
2. Choose primary category.
3. Script proposes next unused permanent code.
4. Generate project record with visibility: hold.
5. Write title, subtitle, summary, tags, accents, metadata.
6. Capture/add poster.
7. Add preview if warranted.
8. Add collections/relationships where meaningful.
9. Validate.
10. Change visibility to listed.
11. Commit.
```

No homepage, card, search, statistics, or routing code may require editing.

The workflow must remain the same for project #21, #50, and #150.

---

## 24. Discovery of unindexed repositories

Target command:

```bash
npm run projects:discover
```

It may compare GitHub repositories/Pages projects against the registry and report:

```text
INDEXED
UNINDEXED
IGNORED
```

A discovered repository is never automatically published. It becomes a `hold` candidate for manual curation.

Optional GitHub topics may be used later:

```text
thiepn-hub
thiepn-hub-ignore
```

---

## 25. Rename, split, merge, and move rules

### Rename

Change display title, preserve code and slug where practical, and add former title to aliases.

### Repository move

Update `repo`; code remains.

### Rewrite

A rewrite from HTML to TypeScript/React/etc. does not create a new code if product identity is unchanged.

### Split

Original project keeps its code. New independent project receives the next code. Avoid `G-004A`/`G-004B`.

### Merge

Primary surviving project keeps its code. Other code becomes archived/retired or redirects with historical context.

### Versions

Do not create new catalogue entries for every product version. Version belongs inside the existing record.

---

## 26. Resource threshold

A PDF/resource deserves its own `R-###` Artifact only when it is independently discoverable and useful without requiring the parent app.

Supplementary PDFs do not automatically become separate catalogue records.

---

## 27. Publishing threshold

A project may be `listed` when it has:

```text
working destination
+ comprehensible purpose
+ presentable poster
+ no severe known blocker
```

It does not need to be perfect. Beta and Experimental projects belong in a living archive when labeled honestly. Broken projects do not.

---

## 28. Validation

### Build errors

Must stop build:

- duplicate code;
- duplicate slug;
- ledger mismatch;
- missing required field;
- invalid category/status/visibility;
- unknown collection;
- listed project without usable destination/unavailable state;
- broken internal relationships;
- invalid required asset path.

### Warnings

May continue but require attention:

- missing custom poster;
- no related artifacts;
- missing `lastMajorUpdate`;
- P1 preview on a Featured project;
- unusually long subtitle/summary;
- media above preferred budget.

Featured artifacts have stronger requirements: usable live URL, listed visibility, accent pair, rich copy, and at least P3 preview; Hero Artifacts should prefer P4/P5.

---

## 29. Public catalogue export

The build may generate:

```text
/catalogue.json
```

with safe public metadata for future timeline/constellation/integration views.

Do not expose:

- internal readiness scores;
- private curation notes;
- unpublished/hold entries;
- credentials or tokens.

---

## 30. Future-proofing

The same data should be capable of powering future optional routes such as:

```text
/timeline/
/explore/
/updates/
```

without creating parallel hand-maintained datasets.

The catalogue is the foundation; views are projections of it.

---

## 31. Acceptance rule

The content architecture is correct only when:

> **No visual component contains a manually typed project name, project count, category membership, project URL, status, collection membership, or Featured placement. All such information must flow from validated project/collection data.**

This file is authoritative for catalogue/content behavior. A future schema change must be deliberate, versioned, and migrated rather than patched project by project.
