# THIEPN HUB H6 — Workflow handoffs

H6 adds usable manual workflow guides and an unwired transfer-validation foundation, stacked on H5. Automatic resource transfers remain disabled. No app repository, private database, Account grant registry or production deployment is changed. H5 CI passed before this branch began.

## Capability reconciliation

The H0 roadmap requests Scan/PDF/Library and notes/documents paths with permission, provenance, revision and recovery checks. Current owners support native export/import paths; they do not expose a certified common Hub transfer API. H6 therefore implements the manual paths fully while preserving the certification gate for automation.

| Owner | Audited revision | Supported handoff today | Limit |
|---|---|---|---|
| Scan | `4fed03797cda8009a1df7d9fef2cd8cc03de6739` | Android PDF export through Save As / Storage Access Framework; existing FileProvider sharing | `/scan/` is a product/installation page, not a browser scanner or Android deep link |
| PDF Studio | `77a5af04fcee613ddf09d32d3e4aa9d70ea0a52a` | User-selected PDF intake, editing, download; app-owned checkpoints and recovery | A Hub launch carries no file; project autosave is not an exported result |
| Library | `f8ccec78d2290d1b3dfde7343d5e19db32ccdf43` | `/library/saved/` selects/imports EPUB or PDF into browser-local My Library | Imports are copies, not Account cloud resources; same-origin storage is not a Hub grant |
| Notes | `a14d671bebe8715640c11ad5c8c5988749bfd820` | Export selected notes as a Markdown archive | Extract Markdown before opening it; archive/export does not create a live shared note |
| Manuscript | `0e5c941756f42c6a02acef9ffd833690e1ea33b7` | Open Markdown/text files, edit a distinct draft, source/project exports and Publish options | No certified Hub resource importer, update-back or automatic publication receipt |

Evidence includes Scan README export/privacy rules; PDF `public/manifest.webmanifest`, task-first intake and download/recovery source; Library `src/pages/saved.astro` and `src/lib/client/personal-books.ts`; Notes `BulkSelectionToolbar.tsx`, `NotesWorkspace.tsx` and `bulkExport.ts`; Manuscript `index.html` file-open, Markdown save and Publish handlers. The reviewed public catalogue remains the canonical launcher source. Metadata lists a conservative subset of formats used by these guides; it is not a complete app capability inventory.

PDF's installed share target and file handlers are real owner capabilities, but their availability depends on installation/browser/OS. Hub does not silently choose an OS share target or send a file to `share-target`. Scan's native content URI is not inserted into a web URL. The fallback is explicit Save As/download followed by destination file selection.

## Guides and exact behavior

`/flows/` is a public, progressively enhanced guide page. Home's daily board links to it. Search Actions includes three named guides, alongside the four existing direct app actions. Selecting a guide does not launch all its apps.

| Guide | Steps | Recovery/ownership rule |
|---|---|---|
| Scan, edit and read a PDF | Export in Scan; edit/download in PDF Studio; select/import in Library | Preserve the original scan and exported original. Edit a separate version, inspect the output and import the chosen copy. |
| Edit a PDF for Library | Edit/download in PDF Studio; choose the reading copy in Library | Earlier imports and their reading progress remain separate. Hub does not overwrite a book or migrate reading position. |
| Turn notes into a manuscript | Export/extract selected Markdown in Notes; open or combine source in Manuscript | Keep source attribution, original notes and durable draft/source backups. Draft edits do not update the notes. |

Each step has owner, instruction, Check in the app, an expandable If something stops explanation, and one canonical app link. Links explicitly open a new tab, suppress referrers and use `noopener`; the guide remains available. Scan's label says Open Scan product page. No file picker, file body, resource identifier, password, token, clipboard import or private title is collected by Hub.

Guide selection and View step links update only public `flow`/`step` coordinates. Exactly one visible guide and step receive current-position semantics. Steps remain readable and directly reachable; selecting a step is not a completion event or confirmation. There is no progress percentage, completion checkbox, success badge or implicit Next-app launch. The polite status explicitly says no file transfer or app outcome was confirmed.

Reload/history restore a valid position. Unsupported IDs or invalid/out-of-range step values recover safely. Initialization retains only allowlisted guide coordinates, stripping arbitrary query fields. This is URL hygiene, not retroactive erasure of a query that was already transmitted. No guide state or private resource history is stored. A bookmark may preserve public guide position; app-owned files and drafts need their own recovery.

Without JavaScript, all three guides and canonical owner links remain visible. Browser-local PDF/Library/Manuscript availability depends on each app's own storage/PWA state; Hub does not promise offline installation, app availability or cross-device copies. Instructions wrap at 320 pixels and 200% text rather than truncating; recovery details are adjacent to their step. There is one page scroll and no step wizard that blocks access to later instructions.

## Copy, reference and provenance

Current workflows use explicit copies. The original scan, note or PDF is retained in its owner; download/import creates a selected version in a different destination. These copies are not live subscriptions. A source edit, cloud sync or revised publication does not update the copy automatically. A renamed file alone is not proof of a new or identical revision.

The guides require checking downloaded output and checking the destination before repeating imports. This prevents the portal from describing a missing download, cancelled picker or failed import as completed work. Library's native duplicate, integrity and storage handling remains authoritative. Hub cannot verify those outcomes today and does not replace them with local checklist state.

For Library → Notes → Manuscript citations, structured reference resolution and excerpt provenance remain deferred until a reviewed owner resolver exists. H6's Notes → Manuscript guide supports manual attribution; it does not infer source work/page identity from copied text. Bible translation reuse, language scheduling and app-specific planner/diet/game transfers remain separate capability work, not capabilities granted by these file guides.

## Future typed transfer foundation

`src/lib/workflows/transfer.ts` defines a version-1 metadata protocol and validators. It is not imported by a page controller, exposed as an endpoint or implemented by an owner transport. `AUTOMATED_TRANSFERS_ENABLED` is false, and every default destination policy denies transfers. Tests explicitly enable fictional policies only.

A source reference contains owner, opaque resource ID, immutable revision, declared MIME, byte count, SHA-256 and exact account/device context. It contains no body, download URL, bearer token, private filename or display title. MIME is only a compatibility declaration: a destination must independently inspect actual bytes, resource digest and format, enforcing its own hostile-content and size policy. A Notes reference describes one resolved Markdown resource, not a ZIP archive pretending to be Markdown.

The intent binds request ID, stable idempotency key, explicit copy/reference mode, source revision/digest, selected destination/context and an expiry of at most five minutes. Validation requires both current source read and destination write purposes, exact grant contexts, destination compatibility, byte budget and a reviewed mode. Unsupported source scopes/workspaces/translations are denied. Device-private transfers between different device identities require a certified bridge and are currently rejected.

The metadata and grants passed to the validator must originate at a trusted owner/authorization boundary. They are not browser-supplied proof of identity or permission. Each source must authorize the exact resource/revision and every read; each destination must authorize intake and write. Hub identity, public catalogue membership, a matching MIME, a content hash or a link cannot grant either permission. Actual access resolution must stay short-lived at the owner boundary, never in URL query strings.

A committed receipt must bind the request and idempotency key, the full source/provenance context and revision, destination/context, chosen mode, destination resource/revision, unchanged copy digest and commit time. Unknown fields, wrong requests, stale intents, changed context/revision/digest, arbitrary URLs, invalid timestamps and non-committed outcomes are rejected. This describes a byte-preserving transfer, not an edit/conversion operation: a transformed result needs its own reviewed operation and input/output lineage contract.

Receipt validation checks metadata consistency; it cannot establish that a server committed bytes or that the receipt issuer is authentic. A future adapter must authenticate the issuer and independently verify durable destination state. A reference mode also requires an actual supported source resolver and destination reference lifetime policy. There is no reference-mode UI or certified reference destination today.

## Recovery and idempotency

The memory-only `TransferTracker` distinguishes idle, pending, committed and needs-reconciliation. A redirect, share invocation, launch or timeout cannot set committed. Only a bound receipt does. Repeated identical receipts are accepted; conflicting receipts for the same intent are rejected. A pending or uncertain operation prevents starting another intent until explicitly cleared/reconciled. Clearing forgets the view; it does not undo a destination commit, cancel a durable write or authorize a new retry.

The tracker neither sends requests nor retries, polls or persists receipts. It is not a durable idempotency service. Before automation is enabled, owners must persist a unique actor/destination/idempotency-key record and operation fingerprint, atomically commit the destination with its receipt, return the same result on replay and reject reuse of a key for changed input. A timeout must be reconciled at the owner using the same identity before retrying. Never generate a fresh key merely because the browser saw no response.

A future controller must cancel request work and clear its tracker on sign-out, account/workspace/device/grant change, consent revocation, privacy lock/hide and page lifecycle boundaries. It must revalidate fresh grants before every dispatch and receipt display. An expired intent cannot be confirmed by the current receipt validator; a separate authorized reconciliation request is required. Recovery across process/browser loss requires an owner ledger, not a Hub localStorage queue containing private references. No such transport or ledger is claimed complete in H6.

## Research decisions

Primary references consulted 2026-10-02:

- [MDN Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Share_API): OS target selection, transient user activation, permission policy and availability checks. Owner-installed sharing is optional; manual file selection remains the dependable guide path.
- [MDN Blob type](https://developer.mozilla.org/en-US/docs/Web/API/Blob/type): declared MIME is not byte/content verification. Compatibility metadata must not bypass destination inspection.
- [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): default denial and owner-side permission checks for every request. Context bindings supplement, rather than replace, authorization.

The conservative copy/version guidance and receipt/reconciliation contract are THIEPN design decisions informed by current owners' recovery behavior. They are not evidence that the future transport has been certified.

## Verification and release gates

Verification on 2026-10-02: 144 unit checks passed, including 11 H6 cases for guide bounds, production default denial, compatible copies, account/device grant isolation, MIME/mode/size/version rejection, provenance and receipt binding, uncertain outcomes and duplicate receipts. All 51 distinct local Chromium checks passed across H1/H3/H4/H5/H6. The first run found a current-step marker also applied to hidden guides; after correction, all seven H6 checks passed again. Typecheck returned zero errors/warnings with seven existing hints. Build, generated-output, catalogue/media/link syntax and performance gates passed.

Browser coverage includes guide URL cleanup, position/history/reload, recovery details, canonical no-payload app links, no automatic private reads, Home/Actions discovery, no-JavaScript fallback, axe, light/dark, 320/1440 pixels and 200% text. Workflow initial HTML/JS/CSS is 19.9 KiB gzip; the route is included in the ongoing performance audit. This excludes subsequent media/fonts and is not a field Web Vitals measurement. Receipt fixtures are fictional and do not certify a real app transaction. H2 auth code was not changed; the paired Account suite was certified in H5, not rerun or re-certified by H6. Physical-device/installed-PWA and cross-engine CI qualification remain separate. The default build preserves H2's disabled production identity and H3/H5's disabled private reads. No private app payload is read. No production app is installed, imported into or mutated by H6 tests.

Remaining gates: authenticated source resolver; destination import/reference adapter; resource-byte inspection and durable provenance; purpose-specific Account/device grants; owner idempotency/reconciliation ledger; real revocation and privacy lifecycle wiring; native Android/content-URI and installed-PWA device matrix; real file/version recovery certification. The working manual guides can be reviewed independently of these gates. No merge or deployment occurs in this phase.

Next: **H7 — Scale to 100–250 apps**. Qualify metadata onboarding, discoverability, bounded provider selection and performance without adding a bespoke Home card or global private fan-out for every app.
