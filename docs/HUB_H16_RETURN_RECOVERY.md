# THIEPN Hub H16 — Dashboard Recovery & Consistent Return Journeys

**Stacked exact parent:** H15 draft PR #148, `feat/hub-h15-daily-focus`, commit `97e02829f1773e747928c2bae6252b75a9503c65`. Stacked ancestry continues H14 #147 → H13 #146 → H12 #145 → H11 #144 → H10 #143 → H9 #142. Nothing in earlier branches, `main`, or production has been merged or deployed.

## Implemented source functionality

H16 adds substantial **returning-user** and **interruption recovery** functionality to the original Hub-owned workspace without a new database, persisted return cursor, hidden progress store, or cross-app authority.

1. **Useful source-backed Home return card.** Pure `renderReturnJourney` reads only the existing `WorkspaceState.tasks`, `notes`, `activity`, `captureDraft`, active workspace, original layout recovery draft, and current storage status. Displays actual due/overdue/Inbox counts, local upcoming event sample count, most recently updated Hub note, next unfinished task, last recorded Hub activity time, and existing unsaved draft status. The first-use/empty path offers local capture without fictional recent work or fabricated owner-app progress.
2. **Continue original drafts and tasks.** Resume a pending capture with the original H12 editor and `captureDraft`, open the original note/task editor by ID, reopen the original local task focus panel and use native Inbox/navigation actions. The Home card never creates a copy of a task, note, or past action.
3. **Mobile return journey.** The current mobile Today summary shows an explicit **Resume draft** action when the original owner-scoped `captureDraft` has content. The button uses the original local capture flow rather than new storage or an unauthorized Notes write.
4. **Recovery across original Hub pages.** A responsive status strip distinguishes original IndexedDB/CAS conflicts, storage failure, unconfirmed local edits, interrupted layout drafts, and active layout editing. It offers the original **Export**, **Retry**, **Reload** review actions, and a new read-only comparison for confirmed saved data. Privacy masking suppresses detailed text in the strip.
5. **Read-only saved-versus-current comparison.** With the original current-owner `WorkspaceStore.load()`, view this tab's counts beside the existing persisted record and report added/modified/saved-only task, note, event and layout record counts, plus revision numbers. No auto-merge, overwrites or private-record upload. Asynchronous reads recheck the current identity epoch, store instance and privacy state before showing the comparison.
6. **Safe interrupted layout recovery.** Original `readDraft()` validation remains authoritative. If the original layout revision still matches, resume the existing edit; if it diverged, prevent unsafe replacement and offer **Save draft as new layout**. A copy gets new IDs via the original `mutate()` and owner-scoped writer; the old draft is cleared only after the new layout genuinely persists. Storage conflicts/dirty state/cap limits stop the action without deleting the original recovery draft. Existing active layout edits and original editor undo remain authoritative.
7. **Non-destructive locked record recovery.** If an IndexedDB record cannot be parsed/opened, the existing raw recovery-export route remains available and the original saved record stays untouched. An explicit **Recheck saved record** action retries opening that same verified identity's existing store, without resetting browser storage or generating a replacement. User messaging warns against destructive site-data clearing.
8. **Source freshness and authorized owner continuity.** Home links directly to H11's *existing* Continue desk; its owner-validated, consent-gated, expiring metadata retains source timestamps and native app actions where available. H16 does not register another private provider read, session-token transport or calendar/StudyOS source. The return card separately labels browser-local records, checked owner-source data, and unavailable external progress.
9. **Direct keyboard and small-screen workflows.** Alt+Shift+R focuses Home's return area when private state is available; Alt+Shift+F and Ctrl/Cmd+K continue to use their original H15/H14 behaviors. Mobile cards, native button actions and recovery comparison use accessible layouts. The existing task/notes/calendar paths remain intact.
10. **Inherited focus-rendering correction.** H15's `render()` used a local `focus` variable for the active element that shadowed focus-session state. H16 renames that local reference so the actual focus selection, quiet mode and clock are used. This fixes the source collision without creating a second focus authority.

### Changed files

- `src/lib/workspace/return-journey.ts` — new pure Home return, saved-state comparison and recovery strip.
- `src/scripts/workspace-home.ts` — original renderer, existing owner store reads/writes and recovery controls; identity/privacy guards; safe draft behavior and keyboard.
- `src/components/workspace/WorkspaceShell.astro` — responsive recovery strip and stylesheet mount.
- `src/styles/workspace-return-h16.css` — desktop/mobile return and recovery surfaces.
- `src/lib/workspace/home-view.ts` — original mobile Today capture-draft resume.
- `src/components/workspace/ContinuationDesk.astro` — anchor for original authorized source status and freshness.
- `docs/HUB_H16_RETURN_RECOVERY.md` — this implementation record.

## What H16 does not claim

- **No new persistent restore point.** Recovery is based on the original saved layout `drafts`, existing `WorkspaceState.captureDraft`, native `backups`, the live in-memory state, and original IndexedDB `records`. There is no additional shadow database or automatic merge.
- **No guaranteed write on immediate browser termination.** H12's debounce, Save Draft Now, best-effort pagehide flush, unload warning and native export remain. A browser may terminate before an asynchronous IndexedDB write finishes; a draft not yet committed cannot be recovered from a different tab/device.
- **No automatic cross-tab merge.** The comparison describes record differences and revisions, not safe line-level reconciliation. The user must export before choosing to reload; CAS remains authoritative.
- **No fabricated external continuity.** Google Calendar live sync, KLIPS/ILIAS, StudyOS, owner Notes/Library/TMS60 progress, external provider status and calendar event writes are not invented. Only H11's already granted, currently valid owner snapshots have source timestamps/coverage. Reading a Hub task is not reading StudyOS.
- **No separate return-history log, notification timer, sync store, university progress, owner-provider grants, migrations, account modifications, or paid services.** All native writes still go through the pre-existing Hub `mutate → parseState → WorkspaceStore.save` with owner namespace, revision handling and undo.
- **NOT TESTED / NOT BUILT.** As instructed, no tests, typechecks, builds, CI, audits, acceptance suites, browser verification, migrations, merges, deployments, credentials or production changes were run. The committed implementation's runtime behavior is unverified.

## H17 — Contextual Work Handoffs & Workspace Coherence

The next substantial product batch can make transitions between Hub's original task, note, local event, source-authorized owner app and existing daily focus views more coherent: contextual task-to-note navigation, reviewable draft-based planning to local calendar events **only by explicit user confirmation**, better mobile command flows, consistent provenance and source revocation labels, and one-action return to the original record after an interruption. Reuse task/note/event IDs and existing writers, storage, app auth and H9–H16 UI. Do not create an external academic task writer, parallel link store, fabricated synced progress or silent calendar changes.
