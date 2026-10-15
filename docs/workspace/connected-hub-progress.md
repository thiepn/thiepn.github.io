# Connected Hub implementation checkpoint

This branch integrates the account-sync branch and the H9–H20 feature stack onto current main. It is a review candidate, not a claim that the entire 19-package program is complete or deployed.

## Implemented in the integrated candidate

- One reviewed launch projection now supplies Apps, Home shortcut choices, public search, the command palette and release counts. Core PR 112 preserves all 27 legacy destinations and adds Diet, Recipe, Bike Atlas and Orrery. Games and the active French destination already existed under compatibility IDs; they are not duplicated. Finance and other staged surfaces stay gated.
- Pin/unpin directly in Apps. Edit shortcut contents, title, order and safe private HTTPS links without starting a layout draft. Select Pinned, Recent or Connected sources. Recent-app history can be paused and cleared; custom URLs never enter the public inventory or recent launch records. Unavailable saved shortcuts remain repairable.
- Search, Inbox, Connections and workflow guides use WorkspaceShell. Core navigation retains the document, drafts, theme and planner. The trusted `/home/` reading host remains a full-document boundary. Static utility pages retain their own route/controller lifecycle.
- Default Home remains the customizable widget canvas. Today and Focus are optional presentations over the original records. Duplicate overview panels and redundant toolbar capture buttons are removed. Existing four-item mobile navigation, persistent desktop planner and fluid navigation are preserved.
- Integrate capture, shared task filters, reviewed scheduling, day/week review, weekly carry-forward, focus controls, six optional utility widgets and bounded session-only ICS preview from the feature stack. Hub tasks and calendar events currently remain independent records; persistent task/block relationships and native recurrence remain outstanding.
- Add a connection support table for every launch destination, live status for the three established summary readers and a diagnostic export containing only public software provenance and source status. Consented Notes summaries can resume an exact note through its existing native launch-intent contract. Library exact reader resume retains its device bridge contract.
- Add workspace recovery issues to Attention Inbox and describe the actual reminder limits. Background notifications and native attention feeds are not silently enabled.
- Apply commands to a detached candidate document and validate before adopting it, preventing partially applied edits on failure. Extract shortcut commands/selectors while keeping the existing store writer, durable sync journal, owner isolation and conflict recovery.

## Important outstanding program work

- IP03: finish controller extraction and coordinated schema/writer negotiation before introducing document v2 or persistent task/block and recurrence fields.
- IP04–05: qualify Account PR 83, native app session adoption, real account/device journeys, retention/deletion and lifecycle contracts. Account required CI was last blocked before jobs could start by GitHub payment/spending limits; source changes cannot repair account billing.
- IP06–09: finish utility-route controller consolidation, one provider runtime, per-source last-success/error codes and the complete resource/activity contracts. Diet, Recipe, Bikes and Languages currently have launch support; their native data adapters are not implemented by adding launch cards.
- IP10–12: qualify native capture commands, durable scheduling relations, recurring native events/exceptions, and authorized external calendar APIs. ICS preview is explicitly temporary and read-only.
- IP13–17: complete the remaining layout/mobile acceptance journeys, source-aware tracker/habit projections, authorized federated search, native attention persistence/actions and notification policy/delivery.
- IP18: final exact-head CI in all required engines, real-owner evidence, deployment and production smoke. A local test is not production certification.

The machine-readable package backlog retains these distinctions. Do not mark the program complete from the presence of the draft feature source.

## Local verification record

303 unit tests pass; typechecking reports no errors or warnings. The full workspace run passed 89/90; the obsolete global file-input assertion was scoped to its guide and passed in the targeted rerun. The latest compact-capture/core regression run passed 17/17. The broader utility run passed 118/121; the two changed Inbox/inventory assertions passed after updating them for the new UI, while the existing Byte remote preview images remain an external-network limitation. Release qualification, fault-injection gates, generated outputs, lockfile, owner/CI boundaries and built performance budgets pass.

Exact pinned Library owner qualification passed 35/36 in Chromium/Firefox; the single connection timeout passed on an isolated rerun without changing the two-second owner deadline or privacy assertions. WebKit lacks required system libraries locally. These records do not replace final-head hosted CI, real-owner OAuth/device evidence or production smoke.
