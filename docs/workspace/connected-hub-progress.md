# Connected Hub implementation checkpoint

This branch integrates the account-sync branch and the H9–H20 feature stack onto current main. It is a review candidate, not a claim that the entire 19-package program is complete or deployed.

## Implemented in the integrated candidate

- One reviewed launch projection now supplies Apps, Home shortcut choices, public search, the command palette and release counts. Core PR 112 preserves all 27 legacy destinations and adds Diet, Recipe, Bike Atlas and Orrery. Games and the active French destination already existed under compatibility IDs; they are not duplicated. Finance and other staged surfaces stay gated.
- Pin/unpin directly in Apps. Edit shortcut contents, title, order and safe private HTTPS links without starting a layout draft. Select Pinned, Recent or Connected sources. Recent-app history can be paused and cleared; custom URLs never enter the public inventory or recent launch records. Unavailable saved shortcuts remain repairable.
- Search, Inbox, Connections and workflow guides use WorkspaceShell. Core navigation retains the document, drafts, theme and planner. The trusted `/home/` reading host remains a full-document boundary. Static utility pages retain their own route/controller lifecycle.
- Default Home remains the customizable widget canvas. Today and Focus are optional presentations over the original records. Duplicate overview panels and redundant toolbar capture buttons are removed. Existing four-item mobile navigation, persistent desktop planner and fluid navigation are preserved.
- Integrate capture, shared task filters, reviewed scheduling, day/week review, weekly carry-forward, focus controls, six optional utility widgets and bounded session-only ICS preview from the feature stack. Hub tasks and calendar events currently remain independent records; persistent task/block relationships and native recurrence remain outstanding.
- Track each established summary source’s last successful read, expiry and allowlisted failure code, with account/sharing/retry recovery controls. Limit summary concurrency to three and each read to two seconds; aggregate translation failures as partial results. Keep diagnostic exports free of private titles, resource IDs, response bodies and credentials.
- Add a connection support table for every launch destination, live status for the three established summary readers and a diagnostic export containing only public software provenance and source status. Consented Notes summaries can resume an exact note through its existing native launch-intent contract. Library exact reader resume retains its device bridge contract.
- Add workspace recovery issues to Attention Inbox and describe the actual reminder limits. Background notifications and native attention feeds are not silently enabled.
- Apply commands to a detached candidate document and validate before adopting it, preventing partially applied edits on failure. Extract shortcut commands/selectors while keeping the existing store writer, durable sync journal, owner isolation and conflict recovery.

## Important outstanding program work

- IP03: finish controller extraction and coordinated schema/writer negotiation before introducing document v2 or persistent task/block and recurrence fields.
- IP04–05: qualify Account PR 83, native app session adoption, real account/device journeys, retention/deletion and lifecycle contracts. Account required CI was last blocked before jobs could start by GitHub payment/spending limits; source changes cannot repair account billing.
- IP06–09: finish utility-route controller consolidation, one provider runtime, the complete resource/activity contracts. Diet, Recipe, Bikes and Languages currently have launch support; their native data adapters are not implemented by adding launch cards.
- IP10–12: qualify native capture commands, durable scheduling relations, recurring native events/exceptions, and authorized external calendar APIs. ICS preview is explicitly temporary and read-only.
- IP13–17: complete the remaining layout/mobile acceptance journeys, source-aware tracker/habit projections, authorized federated search, native attention persistence/actions and notification policy/delivery.
- IP18: final exact-head CI in all required engines, real-owner evidence, deployment and production smoke. A local test is not production certification.

The machine-readable package backlog retains these distinctions. Do not mark the program complete from the presence of the draft feature source.

## Verification checkpoint, 16 October 2026

309 unit tests pass in 40 files. The latest connection-health production build and typecheck pass. All 16 account/sync browser tests pass in Chromium and Firefox, including recovery and diagnostic export. All 28 reading-pilot tests pass across Chromium desktop, Firefox desktop and Android preview against the immutable owner build. All 12 Connections handoff/accessibility checks pass across Chromium/Firefox, 320/1440px and light/dark after increasing adjacent action targets to 44px. The refreshed build, generated outputs, release qualification and performance budgets pass.

Hosted Quality at `cb243cc` passed 652 tests, skipped four, and failed one across Chromium, Firefox and WebKit. The failure exhausted the overall 30-second allowance on a three-device WebKit sync journey; its complete-journey limit is now 60 seconds, preserving per-action and read deadlines. Earlier local Byte preview failures did not recur in hosted CI.

The immutable-owner Library paired suite passed in all required hosted engines at that head. The separate reading-pilot suite failed because its fixture opened Account before identity discovery finished, which closed the dialog. The corrected fixture waits for initialization and represents a guest who explicitly signed out; automatic SSO retains separate coverage. Consent, no-cloud-read, expiry, rollback, visibility and exact-resume assertions remain intact. The pilot uses immutable Library owner `7705802`; the staged Library suite uses `b84930b`.

WebKit cannot launch locally because required system libraries are unavailable. Hosted CI must qualify the final head. Real-owner OAuth/device evidence, Account qualification and production smoke remain outstanding; this candidate is not live.
