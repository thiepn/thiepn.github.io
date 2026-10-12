# THIEPN HUB — adaptive workspace foundation

**Approved and finalized:** use [BUILD_PLAN.md](/workspace/thiepn-hub-audit/BUILD_PLAN.md) as the governing implementation handoff. The user accepted the combined direction on 12 October 2026; no additional design-selection step is required. This document remains supporting design context.

Updated 12 October 2026 from the user's feedback on the three visual concepts. This is the current design specification; it supersedes the fixed navigation and constrained-slot assumptions in `modern-hub-design-plan.md`. It is not an implemented or deployed interface.

[Combined desktop concept — layout editing](/workspace/generated_images/exec-f04f05ea-98b6-4d46-b973-53baa11a040b.png). This visual combines all three earlier references and demonstrates the expanded left navigation, permanent right planner and editable center. It contains illustrative sample data.

## Accepted direction

One product system should express all three concepts. Left navigation expands/collapses; the right task/calendar planner remains visible on desktop; the center is a user-configurable widget workspace. Preserve the current Apps screen and directory behavior. Home contains useful selected app shortcuts, not the whole catalogue.

Separate four concerns: shell, layout, widget presentation and underlying data. Changing any layout must not force a different data model, backend, theme or navigation implementation.

## Stable shell

- Left navigation: approximately 224px expanded and 64px collapsed. Provide a labelled toggle like ChatGPT/Notion, remember the preference, retain keyboard access/tooltips in collapsed mode. Navigation and workspace selector stay here.
- Header: global search/command palette and quick capture. Avoid redundant navigation across both header and sidebar.
- Middle: fluid workspace using the space between sidebars. Header contains workspace name, workspace switcher if the left rail is collapsed, and Customize.
- Right: 304–336px persistent planner on desktop, containing Today/date selection, mini calendar, tasks and agenda. It is a shell region, not a removable/reorderable central widget. Right planner functionality survives every preset and workspace change.
- Smaller widths: collapse the left navigation before crushing widgets. At tablet/mobile widths expose the planner through a dedicated Tasks/Calendar view. Always-visible three columns would be unusable on a phone.

## Layout engine

Use a responsive 12-column central grid with widget-defined size limits. Placement is relative to the middle container, not absolute page pixels. Keep rows aligned; never solve layout with canvas coordinates or fixed screenshot heights.

Each widget instance has an ID, a registered type, validated configuration, view variant, visibility, a desktop grid rectangle and a mobile reading order. Minimum width and allowed variants come from its type. More than one instance of a type is allowed when it has different configuration, such as reading and exercise trackers.

Desktop editing supports moving widgets, resizing by useful snapped increments, adding from a library, changing view/configuration, hiding/removing and restoring a starter layout. Compact/medium/wide controls supplement drag resizing. Keyboard Move up/down/left/right and resize controls must work without dragging.

Use deterministic collision resolution, explicit min sizes and undo history. When the center gets narrower, reflow widgets according to minimum sizes and stable order. Do not permanently overwrite the wide-desktop layout after temporarily shrinking a window. On mobile show an editable ordered list; desktop coordinates do not determine an inaccessible focus order.

Prefer CSS Grid for rendering. Evaluate a maintained grid library for editing only after checking touch support, keyboard access, collision behavior, bundle cost and Astro integration. Persist a Hub-owned schema so changing the editor library does not invalidate saved workspaces.

## Widget registry

The registry supplies type ID, title, icon, default configuration, configuration validator, allowed sizes, supported view variants, renderer, capability requirements, empty/error/loading state and migration rules.

Initial widget types:

| Widget | Configuration | Useful variants |
| --- | --- | --- |
| App shortcuts | Pinned app IDs, allowed direct actions, ordering | Compact icon strip, labelled tiles, small grouped list |
| Continue | Supported sources and maximum items | List, detailed rows; only real resumable data |
| Quick capture | Task/note default, draft behavior | Compact input or full editor |
| Trackers | Selected tracker IDs, goal period | Summary tiles, table, individual progress |
| Tracker history | Metric IDs and date range | Single-unit chart, weekly checklist matrix |
| Recent activity | Supported local/source events and limit | Compact feed or detailed rows |

Later widgets should be added through this contract, not by growing conditional markup in the Home route. A task summary widget may show a filtered view, but it must use the same task store as the permanent planner. Do not duplicate independently editable copies of tasks.

## Views and themes

The earlier light dashboard, dense console and grouped workbench become starter presets expressed in the same layout schema. Presets choose widget positions, sizes, configurations and view variants. They do not select separate apps or isolated data.

Theme (light/dark/system), accent and density (standard/compact) are separate appearance settings. A user can combine any preset with either theme. Do not require a dark theme to obtain table-style widgets or a light theme to obtain the grouped layout.

Named workspaces such as Personal, Study and Work each save their own layout. A task, note or tracker is shared underlying content; workspaces can filter it. Duplicating a workspace duplicates its layout and references, not all its records.

Start with one useful default. Additional workspaces and preset swapping can follow immediately after the same engine works; do not create three separate screens first and retrofit customization later.

## Edit workflow

1. Customize enters an explicit edit session. Show subtle handles, resize controls, Add widget, Undo, Cancel and Done. Keep content legible; edits should not turn the whole page into a debug grid.
2. Adding a widget opens a small library grouped by purpose, with a preview, size and data requirements. Only show widgets with useful available behavior; unavailable sources get a clear setup explanation.
3. Configuration covers content selection, presentation and dimensions. Change the live draft preview, not committed preferences yet.
4. Done commits the layout in one transaction. Cancel restores the prior layout. Preserve an interrupted edit draft and offer Resume/Discard when reopening instead of silently losing work or committing it.
5. Remove widget never deletes source tasks, events, notes or logs. Destructive content deletion remains a separate content action.
6. Changing a preset offers to replace the current layout or create a new workspace. Preserve a recoverable prior layout and provide Undo. Avoid silent overwrites.

## Storage and compatibility

Keep layout documents separate from tasks, events, tracker definitions/logs, capture drafts, provider projections and authentication. Layout holds IDs/configuration, never tokens or duplicated private snapshots.

Proposed schema responsibilities, to reconcile with existing Prism/HomeDocument formats before implementation:

- Workspace: stable ID, title, schema version, revision, widget instances, placement per supported breakpoint, mobile order and modification timestamp.
- Preferences: default workspace, expanded/collapsed navigation, appearance and planner preferences.
- Widget instance: stable ID, registry type/version, validated configuration, view variant and layout constraints.
- Content stores: tasks, events, drafts, trackers and logs, each with stable record IDs. Layouts reference these stores.

Use versioned migrations with a recoverable original snapshot. Import validates type/configuration and clamps impossible sizes. Unknown widgets retain their configuration and display an unavailable placeholder, so an older client does not erase a newer layout. Avoid introducing a new incompatible document format without inspecting the existing migration/durability work.

Persist locally first, with truthful Saved on this device status. Define multi-tab revision handling and conflict behavior. Storage failure must preserve the active in-memory edit and offer export/retry. Export/import includes layout and selected local content with a preview of what will be replaced. Cloud layout sync remains a later capability with an explicitly chosen authority.

## Data usefulness

Shortcut choices initially come from explicit user pins, supported app actions and recorded launches. Do not infer actual app-resource progress from a launch. Suggestions can follow later, with an explanation and dismiss control.

Tracker definitions support a title, unit, count/duration/checklist kind, goal and daily/weekly cadence. Logs drive every display variant. Chart units and date windows remain consistent. Calendar uses the same local event/task due-date store for mini calendar, agenda and full calendar views. Connected calendar sources are separate integrations, not implied by showing a calendar.

The right sidebar selects Today by default, allows date navigation, inline task addition, completion with Undo and agenda event editing. Its state stays independent of central layout editing and workspace selection.

## Implementation order

1. Refine the combined visual with normal/edit modes and expanded/collapsed navigation. Confirm that the widget affordances and permanent planner match the user's intent.
2. Inspect current main plus Prism layout/schema/durability code; preserve useful existing modules and identify migration requirements. Establish a runnable full checkout and screenshot-capable preview.
3. Implement the shell, semantic tokens and the layout document/registry/rendering engine. Keep the Apps screen's content and behavior intact. Add the shortcuts widget as the first real renderer.
4. Implement editing, responsive reflow, persistence, Undo/Cancel, widget library and view variants. The layout editor is the foundation, not an optional final step.
5. Implement the right planner and real local task/event stores; add capture and tracker stores/renderers. Verify removing widgets cannot erase records.
6. Express all three starter layouts with the same engine. Add workspace duplication/switching, themes, density, export/import and interrupted-edit recovery.
7. Qualify any connected sources separately, then review screenshots and deploy the integrated UI through the supported release process.

## Acceptance criteria

- The user can expand/collapse the left sidebar; the desktop planner remains visible in either state.
- The center can reproduce the three earlier compositions through saved widget layouts and appearance, without separate Home implementations.
- Widget move/resize/add/remove/view settings survive refresh and workspace switching.
- Navigation, right planner, layout and underlying records remain independently scoped.
- Task completion and tracker logging update every relevant view consistently.
- Narrow-window reflow never overwrites the saved large-screen layout; mobile order is explicit and accessible.
- Undo/Cancel and storage-failure recovery work; importing old or unknown widget versions does not erase data.
- Existing Apps behavior survives; Home has a useful small selection of shortcuts.
- Tests target editor transactions, migration, collision/reflow, multi-tab conflicts and deletion isolation; browser checks verify keyboard editing, actual persistence and responsive controls.
- Screenshots document normal/edit modes, rail states, three presets, light/dark, desktop/mobile. Production completion requires verifying the served interface.
