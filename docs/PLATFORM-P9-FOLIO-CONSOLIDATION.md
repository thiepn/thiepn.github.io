# Platform P9 — Folio projection in Hub

Hub does not visually collapse the existing Notes, Library, Manuscript or Canvas project cards in P9.

Instead, P9 records their canonical Folio module identities so later Hub work can group them without changing compatibility first:

| Existing catalogue slug | Folio module |
| --- | --- |
| `notes` | `folio/notes` |
| `thiepn-library` | `folio/library` |
| `manuscript` | `folio/write` |
| `canvas` | `folio/canvas` |

`folio/home` and `folio/knowledge` remain staged.

The existing `thiepn/folio` repository is now bound as the staged home provider because it already owns Tasks, Projects and Planning. That does not mean the unified Folio family UI is complete.

P9 therefore changes identity/ownership metadata, not the public catalogue presentation. Existing project routes, live URLs, deep links and cards remain intact.
