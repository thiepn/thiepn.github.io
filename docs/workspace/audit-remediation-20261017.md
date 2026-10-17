# Hub audit remediation — October 17, 2026

## Batch 1: Undo and failed saves

Addresses audit findings D01 and D02. These changes are not a claim that Account connection or the other audit findings are resolved.

Undo now records the state before and after a command. It is invalidated when another tab, a cloud reload, a later command, a draft change or an identity transition changes that state. The queued Undo also checks the expected state, and persistence retains its revision comparison. If a concurrent write is discovered during persistence, the attempted Undo is rolled back in memory instead of replacing the newer saved record. This is conservative invalidation; it does not support undoing an older command across unrelated later edits.

Mutation callers now receive the actual operation result while the shared queue separately recovers from errors. A validation failure therefore reaches the form error handler instead of closing the dialog. When storage was available but a form's write fails, the model is rolled back and the proposed values remain in the form. Retrying applies one command rather than duplicating a previously staged record. Capacity errors identify the collection and limit.

Browsers with storage unavailable from the outset retain the existing temporary in-memory workflow and export controls. This is distinct from a write failing after storage was opened.

Regression coverage:

- Two tabs add tasks; the first tab's stale Undo is removed and both records survive reload.
- A later rail preference change removes an obsolete Undo control.
- At 100 trackers, the next creation preserves the form and a subsequent valid command can still save.
- An injected storage write failure preserves input; retry creates exactly one task without page errors.
- With cross-tab messages unavailable, revision comparison rejects a stale Undo and both persisted tasks survive.
- Existing normal Undo, blocked-storage, offline, import/export and identity-isolation scenarios remain required.

## Remaining priority work

D03: Offer reviewed access/import for existing guest work when an Account session is adopted, without silently uploading shared-device content.

D04 and D05: Consolidate managed and legacy connection states and readers; ensure one busy source cannot hide other connected app insights.

E01: Restore Account CI capacity, qualify the pending Account changes, and reconcile deployed migrations with main. This cannot be solved by bypassing CI or changing Hub labels.

The remaining navigation, calendar, shortcut, accessibility, performance and product-completeness findings stay open. Release and deployment evidence must identify the merged commit before these fixes are marked live.
