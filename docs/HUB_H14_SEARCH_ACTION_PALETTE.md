# THIEPN Hub H14 — Unified Search & Action Palette

**Parent:** H13 draft PR #146 (`feat/hub-h13-expanded-widget-library`), exact verified head `a85f88fec438d8cb4f256f15e5be8f95cbac7a2a`, stacked on H12 PR #145, H11 PR #144, H10 PR #143 and H9 PR #142.

## Implemented in the existing WorkspaceShell

H14 **replaces** the original text-only Ctrl/Cmd+K search dialog, keeping the original shortcut, identity owner, renderer, `WorkspaceStore`, account gate, native actions and reviewed app catalog. A new **on-demand pure search function** in `src/lib/workspace/search-palette.ts` derives bounded results directly from the current in-memory state every time a user searches. It does **not** build another search database, write activity history, query cross-app providers or transfer private data.

- Grouped, source-labeled results: **Actions, Hub tasks, Hub local calendar, Hub local notes, Apps**. Searches existing task titles/notes, local note titles/body, event titles, and reviewed app titles/category/slug. Results use case-/accent-insensitive token/exact/prefix/substring ranking and bounded per-group/global caps.
- **Context-sensitive commands:** create a local note or Inbox task, add a dated task or local event, process Inbox, view today's/upcoming tasks, open the local Calendar, Home, Apps, Connections and Settings. App/route suggestions are safe canonical navigation URLs; no unverified owner deep links.
- Task records display genuine deadline/overdue/completed/priority provenance, open the original task editor, and offer **Today, Tomorrow and High** quick actions only when incomplete. These call the original `applyTaskPlan` through `mutate → parseState → WorkspaceStore.save`, preserving content undo, account namespace, CAS/revision conflicts and activity authority. They do **not** create calendar events or academic assignments.
- Local notes and calendar events open the original editors by real record ID. Private actions confirm that a record still exists before opening, including after a cross-tab change. New capture uses H12's original capture form and draft.
- Search category chips, query prefixes `>` actions, `@` apps, and `#` tasks; clear distinctions between categories and owner sources. No-result, truncated/limited results and privacy/recovery/offline messages.
- Keyboard: **Ctrl/Cmd+K** opens/focuses the palette; Up/Down navigate actual action/link controls; Enter from the input selects the first result; Home/End move among focused results; Escape closes the native modal; Tab supports links, task quick actions and category chips. The original separate capture shortcut remains unchanged.
- Mobile: existing visible topbar search trigger, a full-width bottom-sheet-style modal, touch-sized scope chips and quick actions, readable result rows and scroll-limited results. Search input is semantically a searchbox, not a fake ARIA combobox.
- Privacy and connection safety: when identity is checking, local IndexedDB is unavailable, or privacy is masked, private results and write commands are excluded. Reviewed app links/public route navigation remain available. Result text is HTML escaped; the query is not encoded into the URL, IndexedDB, search history, analytics, or remote API. Results are derived on demand and cleared on palette dismissal; search rerenders when an original workspace mutation changes the underlying state.
- Native owner-app limitations: Notes/Library/TMS60 source-authorized metadata remains in the pre-existing H11 Continue desk only; H14 does not claim cross-app search, fetch unseen private resources, search Google Calendar imports or bypass owner consent. The original H10 Google export parser remains unchanged.

## Exact files

1. `src/lib/workspace/search-palette.ts` — new on-demand ranking, scoped matching and bounded result model.
2. `src/scripts/workspace-home.ts` — group rendering, category chips, native command execution, focus/keyboard logic, status and cleanup.
3. `src/components/workspace/WorkspaceShell.astro` — accessible search modal and mobile surface.
4. `src/styles/workspace-palette-h14.css` — responsive results and focus/touch layouts.
5. `docs/HUB_H14_SEARCH_ACTION_PALETTE.md` — this scope/implementation record.

## Limitations and deferred integrations

- **No new provider search contract.** Hub cannot currently search inside StudyOS, owner Notes, Library or TMS60; their only authorized metadata remains within H11's owner session scope. No user-data retrieval from private app stores or Google's APIs is implied by a search result.
- Source-owned Hub records live in the current browser/account namespace. A result may be stale after another tab changes the same record; native write operations still go through original conflict handling. If storage is locked or identity changes, only public results are displayed.
- Very broad searches are intentionally capped. The palette uses live current-state scanning and not a persistent index. Ranking is deterministic and context-sensitive but not an AI recommendation, semantic/full-text external search or proof of relevance.
- Quick task actions change the same task's due date or priority; they preserve H12's rule that moving a task clears its old clock time. Undo remains subject to original writer limitations and persistence availability.
- Reusing the current app URL catalog does not imply live app availability or authenticated session to every app. Owner connections still require separate explicit permissions.
- **NO TESTS, TYPECHECK, BUILDS, CI, AUDITS, BROWSER/DEVICE ACCEPTANCE, MIGRATIONS, MERGES, DEPLOYMENTS, CREDENTIALS OR PRODUCTION CHANGES** were performed as requested. This is committed source-only implementation, not a verified release.

## H15 — Daily Focus, Attention & Workspace Personalization

Make Home actionable without building another scheduler or progress engine: a source-honest daily focus panel over overdue/today/inbox Hub tasks, optional goal-limited focus sessions and a filtered quiet view, fast transitions to native task/editor actions, accessible mobile/keyboard flow, and a non-persistent focus session timer only if scoped appropriately. Reuse the original task, calendar, capture and layout authorities; user-selected focus items are not fabricated academic grades or cross-app progress. No silent calendar writes, provider permissions or notification automation.
