# H21 — Controlled Pilot Activation

H21 activates the user-selected **Library reading** pilot on Hub Home. This is a desktop, device-local pilot with explicit opt-in; the H20 managed account workflows remain disabled. It lets a reader see recent reading metadata in Hub and continue the exact Library edition and release. Library remains the owner of reading progress, consent and the reader.

## Participant flow

1. Open `https://thiepn.dev/home/` in a desktop browser and choose **Try reading pilot**.
2. Use **Manage Library sharing** to choose Library's device-sharing permissions, if needed. Returning to Home requires joining again because backgrounding ends the pilot.
3. Choose **Connect this browser**. Joining alone never opens the owner bridge or reads progress.
4. Use Continue to open the matching Library revision. Use **End pilot and clear this tab** to stop.

Existing Library consent still applies; joining Hub does not create or widen it. Only `summary` and `continue` are requested, even if Library permits search. Hub shows current and furthest percentage with owner provenance. It never receives chapter text, CFI, book bytes or cloud records. Library's consent may include personal imports; their metadata follows that existing choice. Hub does not persist titles or reading snapshots.

The participant cohort is desktop browsers that explicitly join in that tab. Android and iPad browsers are excluded, including iPad desktop mode. Browser checks are a usability boundary, not authorization; Library's bridge validates consent independently. No accounts, sign-in, inline writes, Notes capture, inbox or transfers are activated. No participant tracking or analytics are added; no actual pilot usage is claimed by browser fixtures.

## Lifecycle and pause

Ending the pilot, hiding Home, backgrounding the document, identity changes or navigating away removes the bridge and clears visible reading metadata and outstanding requests. Reloading or returning never rejoins automatically. A delayed join response cannot override a hidden Home.

`src/data/reading-pilot.json` is the public control. The controller checks it before joining and before owner operations, and every 30 seconds while joined. Invalid, unavailable, changed-scope or paused controls fail closed. A two-second timeout bounds control requests. In a deployed pause, already open foreground tabs end at their next successful control check (normally within 30 seconds); background tabs have already ended. Static hosting requires a deployment to publish a control change.

To pause the pilot, set `enabled` to `false`, restore `release-hub.json` to the H8 `public-handoffs` profile and release ID, run release qualification, and deploy. This removes the pilot from newly loaded Home pages; the updated public control also ends older sessions. Library reading data and sharing consent remain owned by Library.

## Release qualification

The `H21-device-reading-pilot-v1` / `device-reading-pilot` release profile allows only device Library private reads. The release qualifier verifies the exact pilot scope and rendered pilot controls and rejects managed Notes, TMS60, capture or workflow panels. All other Hub feature flags remain off. The existing H20 account workflow gate is unchanged.

Dedicated CI builds immutable Library owner source `77058023894f4d7935c79e291a5dba7daacb8666` and the ordinary Hub production build. Its 20 cases cover Chromium, Firefox and WebKit desktop plus Android and iPad exclusion. Tests use the actual Library bridge and synthetic device progress, with network and storage assertions, explicit consent, metadata clearing, delayed joins, configuration outage and pause. These are browser-engine checks, not physical-device qualification or observed participant feedback. The public artifact verifier compares the deployed release with qualified build bytes.

H20's broader account and physical-device evidence remains outstanding. The next proposed phase is **H22 — Pilot Feedback & Reading UX Refinement**: gather volunteered desktop feedback, reproduce reading friction, and refine this narrow flow before widening scope.
